# WhatsApp VPS Setup Guide — Evolution API on Hostinger

**VPS:** `srv1912272.hstgr.cloud`
**Method:** No Docker — direct Node.js + PM2 deployment
**Estimated time: 30–45 minutes**

---

## Prerequisites

- Hostinger VPS: `srv1912272.hstgr.cloud` (Ubuntu 22.04+)
- Minimum 2GB RAM (KVM 2 plan or higher recommended)
- A domain or subdomain (e.g., `wa.yourdomain.com`) pointing to the VPS
- Access to Hostinger hPanel (for DNS management)
- **No Docker required** — we install Node.js directly

---

## Step 1: Access Your Hostinger VPS

### Option A: SSH from your computer (recommended)

1. Log in to **[hPanel](https://hpanel.hostinger.com)**
2. Go to **VPS** → click your VPS (`srv1912272.hstgr.cloud`)
3. Find the **SSH Access** details (IP address, username: `root`, password)
4. Open Terminal on your computer and connect:
```bash
ssh root@srv1912272.hstgr.cloud
```
Enter the root password from Hostinger when prompted.

### Option B: Use Hostinger Browser Terminal

1. In hPanel → **VPS** → click your VPS (`srv1912272.hstgr.cloud`)
2. Click **Browser Terminal** (or "VNC" button)
3. A web terminal opens — log in as `root`

### Point your domain to the VPS

1. In hPanel → **Domains** → manage your domain
2. Go to **DNS / Nameservers** → **DNS Records**
3. Add an **A Record**:
   - **Name:** `wa` (for `wa.yourdomain.com`)
   - **Points to:** your VPS IP address (find it in hPanel → VPS → Overview)
   - **TTL:** 3600
4. Wait 5–10 minutes for DNS to propagate

> **No domain?** You can use the VPS hostname directly: `https://srv1912272.hstgr.cloud` (skip SSL/Nginx domain steps, but SSL won't work without a domain — WhatsApp webhooks require HTTPS).

---

## Step 2: Update the System

```bash
apt update && apt upgrade -y
```

---

## Step 3: Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

Verify:
```bash
node --version
# Should show v20.x.x
```

---

## Step 4: Install PM2 (Process Manager)

PM2 keeps the API running 24/7 and auto-restarts it if it crashes or the server reboots.

```bash
npm install -g pm2
```

---

## Step 5: Install PostgreSQL (Database)

```bash
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql
```

Create the database and user:
```bash
sudo -u postgres psql -c "CREATE USER evolution WITH PASSWORD 'CHANGE_THIS_PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE evolution OWNER evolution;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE evolution TO evolution;"
```

**Important:** Replace `CHANGE_THIS_PASSWORD` with a strong password. Write it down — you'll need it in Step 8.

---

## Step 6: Install Redis (Cache)

```bash
apt install -y redis-server
systemctl start redis-server
systemctl enable redis-server
```

---

## Step 7: Download Evolution API

```bash
mkdir -p /opt/evolution-api
cd /opt/evolution-api
git clone https://github.com/Atendai/evolution-api.git .
npm install
npm run build
```

---

## Step 8: Configure the Environment

Create the config file:
```bash
cat > /opt/evolution-api/.env << 'EOF'
# Server
SERVER_URL=https://wa.yourdomain.com  # or https://srv1912272.hstgr.cloud
PORT=8080

# Database
DATABASE_PROVIDER=postgresql
DATABASE_URL=postgresql://evolution:CHANGE_THIS_PASSWORD@localhost:5432/evolution
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Redis
CACHE_REDIS_ENABLED=true
CACHE_REDIS_URI=redis://localhost:6379
CACHE_REDIS_PREFIX=evolution

# Authentication — generate a random key below
AUTHENTICATION_TYPE=apikey
AUTHENTICATION_API_KEY=GENERATE_A_RANDOM_KEY_HERE
AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES=true

# Webhook — point this to your Exploro OS app
WEBHOOK_GLOBAL_URL=https://your-exploro-domain.com/api/whatsapp/evolution/webhook  # Your Exploro OS URL
WEBHOOK_GLOBAL_ENABLED=true

# QR Code
QRCODE_LIMIT=30
QRCODE_COLOR=#198754

# Disable history sync to save RAM
SYNC_FULL_HISTORY=false
EOF
```

**You must replace these values:**

| Placeholder | What to put |
|---|---|
| `https://wa.yourdomain.com` | Your subdomain (or `https://srv1912272.hstgr.cloud`) |
| `CHANGE_THIS_PASSWORD` | The password you set in Step 5 |
| `GENERATE_A_RANDOM_KEY_HERE` | A random 32+ character string (see below) |
| `https://your-exploro-domain.com` | Your Exploro OS app URL |

Generate a random API key:
```bash
openssl rand -hex 32
```
Paste the output as the `AUTHENTICATION_API_KEY` value.

---

## Step 9: Start the API with PM2

```bash
cd /opt/evolution-api
pm2 start "npm run start:prod" --name evolution-api
pm2 save
pm2 startup
```

PM2 will print a command starting with `sudo env PATH=...`. **Copy and run that command** — it ensures the API auto-starts when the server reboots.

Verify it's running:
```bash
pm2 status
pm2 logs evolution-api --lines 20
```

You should see the API start without errors.

---

## Step 10: Install Nginx (Reverse Proxy + SSL)

```bash
apt install -y nginx certbot python3-certbot-nginx
```

Create the Nginx config:
```bash
cat > /etc/nginx/sites-available/evolution-api << 'EOF'
server {
    listen 80;
    server_name wa.yourdomain.com;  # or srv1912272.hstgr.cloud

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}
EOF
```

Enable the site and reload Nginx:
```bash
ln -s /etc/nginx/sites-available/evolution-api /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

Get the SSL certificate (free, auto-renewing):
```bash
certbot --nginx -d wa.yourdomain.com  # or -d srv1912272.hstgr.cloud
```

Follow the prompts — enter your email, agree to terms, and choose to redirect HTTP to HTTPS.

---

## Step 11: Set Up the Firewall

```bash
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp
ufw --force enable
```

---

## Step 12: Verify Everything Works

Test the API from your local machine:
```bash
curl -H "apikey: YOUR_API_KEY" https://wa.yourdomain.com/manager/instances  # or https://srv1912272.hstgr.cloud
```

You should get:
```json
[]
```

This means the API is running and ready to accept WhatsApp connections.

---

## Step 13: Add Keys to Exploro OS

In your Exploro OS project, add these environment variables (`.env` file):

```
NEXT_PUBLIC_WHATSAPP_PROVIDER=evolution
EVOLUTION_API_URL=https://wa.yourdomain.com  # or https://srv1912272.hstgr.cloud
EVOLUTION_API_KEY=YOUR_API_KEY
```

Redeploy Exploro OS. The WhatsApp Connect button in the Channels page will now show a QR code.

---

## Quick Reference — Commands Cheat Sheet

| Action | Command |
|---|---|
| Check API status | `pm2 status` |
| View API logs | `pm2 logs evolution-api` |
| Restart API | `pm2 restart evolution-api` |
| Stop API | `pm2 stop evolution-api` |
| Update Evolution API | `cd /opt/evolution-api && git pull && npm install && npm run build && pm2 restart evolution-api` |
| Backup database | `pg_dump -U evolution -h localhost evolution > backup.sql` |
| Check Nginx status | `systemctl status nginx` |
| Check Redis status | `systemctl status redis-server` |
| Check PostgreSQL status | `systemctl status postgresql` |

---

## Troubleshooting

### API won't start
```bash
pm2 logs evolution-api --lines 50
```
Check for database connection errors — verify the password in `.env` matches Step 5.

### QR code not appearing in Exploro OS
1. Verify `EVOLUTION_API_URL` and `EVOLUTION_API_KEY` in your `.env` match the VPS
2. Test connectivity: `curl -H "apikey: YOUR_KEY" https://wa.yourdomain.com/manager/instances` (or `https://srv1912272.hstgr.cloud/manager/instances`)
3. Check browser console for errors

### WhatsApp disconnects frequently
- Ensure the user's phone has internet
- Check `pm2 logs evolution-api` for WebSocket errors
- Restart: `pm2 restart evolution-api`

### SSL certificate expired
```bash
certbot renew
systemctl reload nginx
```

---

## Security Notes

- **Never share your `AUTHENTICATION_API_KEY`** — it controls all WhatsApp sessions
- The firewall blocks all ports except 22 (SSH), 80 (HTTP), 443 (HTTPS)
- PostgreSQL and Redis are only accessible from localhost
- SSL is auto-renewed by certbot
- Consider changing the SSH port from 22 to a custom port for extra security
