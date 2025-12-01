export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const authHeader = request.headers.get('Authorization') || '';
    const expected = `Bearer ${env.SHARED_SECRET}`;

    if (authHeader !== expected) {
      return new Response('Unauthorized', { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response('Invalid JSON', { status: 400 });
    }

    const email = body.email;
    const name = body.name || null;

    if (!email) {
      return new Response('Missing email', { status: 400 });
    }

    try {
      const jwt = await createGhostAdminToken(env.GHOST_ADMIN_KEY);

      const ghostUrl = env.GHOST_URL.replace(/\/$/, '');
      const memberPayload = {
        email,
        labels: [{ name: 'Builder' }]
      };

      if (name) {
        memberPayload.name = name;
      }

      const ghostRes = await fetch(`${ghostUrl}/ghost/api/admin/members/`, {
        method: 'POST',
        headers: {
          'Authorization': `Ghost ${jwt}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          members: [memberPayload]
        })
      });

      if (!ghostRes.ok && ghostRes.status !== 409 && ghostRes.status !== 422) {
        const text = await ghostRes.text();
        return new Response(
          `Ghost error ${ghostRes.status}: ${text}`,
          { status: 500 }
        );
      }

      return new Response(
        JSON.stringify({ ok: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (err) {
      return new Response(
        `Internal error: ${err.message || String(err)}`,
        { status: 500 }
      );
    }
  }
};

async function createGhostAdminToken(adminKey) {
  const [id, secretHex] = adminKey.split(':');

  if (!id || !secretHex) {
    throw new Error('Invalid GHOST_ADMIN_KEY format');
  }

  const secretBytes = hexToArrayBuffer(secretHex);

  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const header = {
    alg: 'HS256',
    typ: 'JWT',
    kid: id
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now,
    exp: now + 5 * 60,
    aud: '/admin/'
  };

  const encoder = new TextEncoder();
  const encodedHeader = encoder.encode(JSON.stringify(header));
  const encodedPayload = encoder.encode(JSON.stringify(payload));

  const headerBase = base64urlFromBytes(encodedHeader);
  const payloadBase = base64urlFromBytes(encodedPayload);
  const data = `${headerBase}.${payloadBase}`;

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(data)
  );

  const sigBase = base64urlFromBytes(new Uint8Array(signature));

  return `${data}.${sigBase}`;
}

function hexToArrayBuffer(hex) {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string');
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes.buffer;
}

function base64urlFromBytes(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}
