import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const WORKER_URL = process.env.CLOUDFLARE_WORKER_URL;
const SHARED_SECRET = process.env.SHARED_SECRET;

async function test() {
  const res = await fetch(WORKER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SHARED_SECRET}`
    },
    body: JSON.stringify({
      email: "test-user-" + Date.now() + "@example.com",
      name: "Test User"
    })
  });

  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Body:", text);
}

test().catch(err => {
  console.error(err);
});
