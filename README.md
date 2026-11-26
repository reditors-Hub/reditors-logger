# REDitors Standalone Logger Microservice (Render.com Free Tier)

This standalone service handles all Discord & Telegram bot logging, IP Geolocation, and Supabase Realtime event listeners for REDitors.

Deploying this on Render's **100% Free Web Service tier** offloads ~80 MB of RAM and active CPU from the main Railway server, keeping Railway costs strictly under **$5/month**.

---

## How to Deploy on Render.com (in 2 minutes)

1. Go to [dashboard.render.com](https://dashboard.render.com) and click **New +** > **Web Service**.
2. Connect this repo: `reditors-Hub/reditors-logger`
3. Settings:
   - **Region:** Frankfurt (EU Central)
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** **Free** ($0.00/mo)
4. Under **Environment Variables**, add:
   - `LOGGER_SECRET`: (generate a secure value, e.g. `reditors_logger_secure_2026_v2`)
   - `DISCORD_BOT_TOKEN`: (Your Discord Bot token from Railway)
   - `TELEGRAM_BOT_TOKEN`: (Your Telegram Bot token from Railway)
   - `TELEGRAM_CHAT_ID`: (Your Telegram Chat ID from Railway)
   - `SUPABASE_URL`: `https://rnruqyeduwmgrpqttamw.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY`: (Your Supabase Service Role Key from Railway)
5. Click **Deploy Web Service**.
6. Copy your Render URL (e.g. `https://reditors-logger.onrender.com`).
7. On Railway, run:
   ```bash
   railway variable set RENDER_LOGGER_URL=https://reditors-logger.onrender.com
   railway variable set LOGGER_SECRET=reditors_logger_secure_2026_v2
   ```
