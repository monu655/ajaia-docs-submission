import { app } from "./app";
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
// Self-ping every 10 minutes to prevent Render free-tier sleep
const SELF_URL = process.env.RENDER_EXTERNAL_URL || "https://ajaia-docs-backend-t578.onrender.com";
setInterval(() => {
  fetch(`${SELF_URL}/api/users`)
    .then(() => console.log(`[keep-alive] pinged self at ${new Date().toISOString()}`))
    .catch((err) => console.error("[keep-alive] ping failed:", err));
}, 10 * 60 * 1000);