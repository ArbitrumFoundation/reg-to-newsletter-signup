# Ghost Newsletter Sync Worker

This is a small Cloudflare Worker that receives a POST request, validates a shared secret, and creates or updates a Ghost member with the `Builder` label using the Ghost Admin API.

Configure your Ghost URL in `wrangler.toml` under vars.
Add secrets using `wrangler secret put` for `GHOST_ADMIN_KEY` and `SHARED_SECRET`.
Deploy with `wrangler deploy` and call the Worker URL from your backend on user signup.

## Testing

You can test the worker by running `node test-flow.js`.

Supply the following environment variables:
- `CLOUDFLARE_WORKER_URL`
- `SHARED_SECRET`

The output should look like:

```
Status: 200
Body: {"ok": true}
```

## LICENSE
[MIT](LICENSE)