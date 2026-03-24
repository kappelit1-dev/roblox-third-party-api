# Roblox Third-Party API

This is an external API service your Roblox server scripts can call using `HttpService`.
It includes API key auth, rate limiting, and proxy endpoints for Roblox public APIs.

## 1) Setup

1. Install Node.js `18+`
2. In this folder run:
   - `npm install`
3. Create `.env` from `.env.example` and set:
   - `API_KEY` (must match key in your Roblox server script)
   - `PORT` (default `3000`)
   - `RATE_LIMIT_WINDOW_MS` (default `60000`)
   - `RATE_LIMIT_MAX` (default `120`)
4. Start the service:
   - `npm start`

## 2) API Endpoints

Public:
- `GET /health`

Protected (require `x-api-key` header):
- `GET /api/profile/:userId`
  - Combined response: Roblox user basics + avatar headshot + your local economy data
- `POST /api/reward`
  - Body: `{ "userId": 123, "amount": 50 }`
  - Adds coins in demo storage
- `GET /api/roblox/users/:userId`
  - Proxies Roblox user endpoint
- `GET /api/roblox/users/by-username/:username`
  - Resolves username to user id/details
- `GET /api/roblox/games/:universeId`
  - Gets game details for a universe id

## 3) Roblox Script Integration

Use `roblox/ServerScriptService/ApiClient.server.lua` as your starter.

In Roblox Studio:
1. Enable **Game Settings -> Security -> Allow HTTP Requests**
2. Put the script in `ServerScriptService` (not `LocalScript`)
3. Set:
   - `BASE_URL` to your deployed API HTTPS URL
   - `API_KEY` to the same key used by your API service

## 4) Deploy as Third-Party API

Good options:
- [Render](https://render.com/)
- [Railway](https://railway.app/)
- [Fly.io](https://fly.io/)

After deploy:
1. Set env vars in your host dashboard
2. Copy your public HTTPS URL
3. Use that URL in `BASE_URL` inside the Roblox script

## 5) Production Notes

- The demo coin storage is in-memory and resets on restart; swap to a real database.
- Keep API keys only in server-side scripts and host secrets.
- Consider adding request logging and rotating API keys.
- Validate sensitive reward actions with your own business rules.
