const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const API_KEY = process.env.API_KEY || "change-me";
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 120);

// Demo storage for in-game currency. Replace with real database in production.
const coinsStore = new Map();

app.use(helmet());
app.use(express.json({ limit: "128kb" }));
app.use(
  rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false
  })
);

function verifyApiKey(req, res, next) {
  const incomingKey = req.header("x-api-key");
  if (!incomingKey || incomingKey !== API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

function parsePositiveInteger(value) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) return null;
  return num;
}

async function callRoblox(path, options = {}) {
  const response = await fetch(`https://${path}`, options);
  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const error = new Error(`Roblox API request failed: ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "roblox-third-party-api",
    uptimeSeconds: Math.floor(process.uptime())
  });
});

app.get("/api/profile/:userId", verifyApiKey, async (req, res) => {
  const userId = parsePositiveInteger(req.params.userId);
  if (!userId) return res.status(400).json({ error: "Invalid userId" });

  try {
    const [user, headshotData] = await Promise.all([
      callRoblox(`users.roblox.com/v1/users/${userId}`),
      callRoblox(
        `thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`
      )
    ]);

    const balance = coinsStore.get(userId) || 0;
    const thumb = Array.isArray(headshotData.data) ? headshotData.data[0] : null;

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        displayName: user.displayName,
        hasVerifiedBadge: user.hasVerifiedBadge
      },
      avatarHeadshotUrl: thumb ? thumb.imageUrl : null,
      economy: {
        coins: balance
      }
    });
  } catch (error) {
    return res.status(error.status || 502).json({
      error: "Failed to load profile from Roblox APIs",
      detail: error.data || null
    });
  }
});

app.get("/api/roblox/users/:userId", verifyApiKey, async (req, res) => {
  const userId = parsePositiveInteger(req.params.userId);
  if (!userId) return res.status(400).json({ error: "Invalid userId" });

  try {
    const data = await callRoblox(`users.roblox.com/v1/users/${userId}`);
    return res.json(data);
  } catch (error) {
    return res.status(error.status || 502).json({
      error: "Roblox users endpoint failed",
      detail: error.data || null
    });
  }
});

app.get("/api/roblox/users/by-username/:username", verifyApiKey, async (req, res) => {
  const username = String(req.params.username || "").trim();
  if (!username) return res.status(400).json({ error: "Invalid username" });

  try {
    const data = await callRoblox("users.roblox.com/v1/usernames/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        usernames: [username],
        excludeBannedUsers: false
      })
    });

    const user = Array.isArray(data.data) ? data.data[0] : null;
    if (!user) return res.status(404).json({ error: "User not found" });

    return res.json(user);
  } catch (error) {
    return res.status(error.status || 502).json({
      error: "Roblox username lookup failed",
      detail: error.data || null
    });
  }
});

app.get("/api/roblox/games/:universeId", verifyApiKey, async (req, res) => {
  const universeId = parsePositiveInteger(req.params.universeId);
  if (!universeId) return res.status(400).json({ error: "Invalid universeId" });

  try {
    const data = await callRoblox(`games.roblox.com/v1/games?universeIds=${universeId}`);
    const game = Array.isArray(data.data) ? data.data[0] : null;
    if (!game) return res.status(404).json({ error: "Game not found for universeId" });
    return res.json(game);
  } catch (error) {
    return res.status(error.status || 502).json({
      error: "Roblox games endpoint failed",
      detail: error.data || null
    });
  }
});

app.post("/api/reward", verifyApiKey, (req, res) => {
  const userId = parsePositiveInteger(req.body?.userId);
  const amount = Number(req.body?.amount);

  if (!userId || !Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: "Payload must include positive userId and amount" });
  }

  const currentCoins = coinsStore.get(userId) || 0;
  const newCoins = currentCoins + amount;
  coinsStore.set(userId, newCoins);

  return res.json({ success: true, userId, newCoins });
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
