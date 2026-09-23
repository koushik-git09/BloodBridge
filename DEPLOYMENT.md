# BloodBridge — Production Deployment Guide

This guide provides step-by-step instructions to deploy BloodBridge to production.

---

## Architecture Overview

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4 (Deploys to **Vercel** or **Netlify**)
- **Backend**: FastAPI + Python (Deploys to **Render**, **Railway**, or **Docker**)
- **Database**: **MongoDB Atlas** (Managed Cloud Database)
- **Push Notifications**: **Firebase Cloud Messaging (FCM)**
- **Email Service**: **SMTP** (Gmail App Password or SendGrid / Resend)

---

## Pre-requisites Checklist

Before starting, make sure you have:
1. A **GitHub** account with this repository pushed to your GitHub.
2. A **MongoDB Atlas** account ([mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)).
3. (Optional for push notifications) A **Firebase** project ([console.firebase.google.com](https://console.firebase.google.com)).
4. Accounts on **Render** ([render.com](https://render.com)) and **Vercel** ([vercel.com](https://vercel.com)).

---

## Option 1: Recommended Deployment (Render + Vercel + MongoDB Atlas)

This is the recommended, most reliable, and 100% free-tier-compatible setup.

```
+--------------------------+          HTTPS           +--------------------------+
|      Vercel Frontend     | -----------------------> |      Render Backend      |
|  (React Vite Static SPA) |                          |       (FastAPI API)      |
+--------------------------+                          +--------------------------+
                                                                    |
                                                                    | Async Driver (Motor)
                                                                    v
                                                      +--------------------------+
                                                      |   MongoDB Atlas Cloud    |
                                                      +--------------------------+
```

---

### Step 1: Prepare MongoDB Atlas (Cloud Database)

1. Log in to [MongoDB Atlas](https://cloud.mongodb.com).
2. Create a free **M0 Shared Cluster** (if you don't already have one).
3. **Database Access**:
   - Go to **Security** → **Database Access**.
   - Click **Add New Database User**.
   - Choose **Password Authentication**, enter a username (e.g., `bloodbridge_admin`) and a strong password.
   - Set privileges to `Read and write to any database`.
4. **Network Access**:
   - Go to **Security** → **Network Access**.
   - Click **Add IP Address** → choose **Allow Access From Anywhere (`0.0.0.0/0`)** so cloud hosts (Render/Vercel) can connect.
5. **Get Connection String**:
   - Click **Database** → **Connect** → **Drivers** (Python).
   - Copy the URI. It will look like:
     ```
     mongodb+srv://bloodbridge_admin:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
     ```
   - Replace `<password>` with your actual database user password.

---

### Step 2: Deploy Backend to Render

1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** → **Web Service**.
3. Connect your **GitHub repository** where BloodBridge is pushed.
4. Configure the Web Service:
   - **Name**: `bloodbridge-backend` (or your preferred name)
   - **Region**: Select the region closest to your users (e.g., Frankfurt, Oregon, Singapore).
   - **Root Directory**: `backend` *(Crucial! Don't leave blank)*
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free`
5. Scroll down to **Environment Variables** and add the following:

   | Key | Example Value | Description |
   | :--- | :--- | :--- |
   | `MONGODB_URL` | `mongodb+srv://user:pass@cluster0...` | Your MongoDB Atlas connection string |
   | `DATABASE_NAME` | `bloodbridge` | Name of your MongoDB database |
   | `SECRET_KEY` | *(Generate a 32+ char random string)* | JWT signing key (generate via `python -c "import secrets; print(secrets.token_urlsafe(32))"`) |
   | `ALGORITHM` | `HS256` | JWT algorithm |
   | `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | Token expiration time in minutes |
   | `CORS_ORIGINS` | `*` | Allowed CORS origins (can restrict to your Vercel URL in Step 4) |
   | `FRONTEND_URL` | `http://localhost:5173` | Temporary frontend URL (will update in Step 4) |
   | `SMTP_HOST` | `smtp.gmail.com` | SMTP Server (for password resets) |
   | `SMTP_PORT` | `587` | SMTP Port |
   | `SMTP_USERNAME` | `your_email@gmail.com` | Email username |
   | `SMTP_PASSWORD` | `your_gmail_app_password` | Gmail App Password (not your regular password) |
   | `SMTP_FROM_EMAIL` | `your_email@gmail.com` | From email address |
   | `FIREBASE_CREDENTIALS_JSON` | `{"type":"service_account",...}` | *(Optional)* Full content of Firebase service account JSON |

6. Click **Create Web Service**.
7. Wait 2-3 minutes for the build to finish. Once live, test your backend:
   - Visit `https://your-backend-service.onrender.com/` → You should see `{"message":"BloodBridge API is running"}`.
   - Visit `https://your-backend-service.onrender.com/health` → You should see `{"status":"healthy","database":"connected"}`.
   - Visit `https://your-backend-service.onrender.com/docs` → Interactive Swagger API documentation.
8. **Copy your Render backend URL** (e.g. `https://bloodbridge-backend.onrender.com`).

---

### Step 3: Deploy Frontend to Vercel

1. Log in to [Vercel](https://vercel.com).
2. Click **Add New...** → **Project**.
3. Import your **GitHub repository**.
4. Configure the Project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click **Edit** and choose `frontend` *(Crucial!)*
   - Build and Output Settings: Leave defaults (`npm run build`, `dist`).
5. Under **Environment Variables**, expand and add:

   | Key | Value |
   | :--- | :--- |
   | `VITE_API_BASE_URL` | Your Render backend URL (e.g., `https://bloodbridge-backend.onrender.com`) |
   | `VITE_FIREBASE_API_KEY` | Your Firebase Web API Key |
   | `VITE_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` |
   | `VITE_FIREBASE_PROJECT_ID` | `your-project-id` |
   | `VITE_FIREBASE_STORAGE_BUCKET` | `your-project.firebasestorage.app` |
   | `VITE_FIREBASE_MESSAGING_SENDER_ID` | Your sender ID |
   | `VITE_FIREBASE_APP_ID` | Your web app ID |
   | `VITE_FIREBASE_VAPID_KEY` | Your Web Push VAPID key |

   *(Note: The Firebase values can be copied directly from your local `frontend/.env.local`)*

6. Click **Deploy**.
7. Vercel will build the frontend and provide your production domain (e.g., `https://blood-bridge.vercel.app`).
8. The included [`frontend/vercel.json`](file:///d:/Projects/Blood%20Bridge/frontend/vercel.json) automatically handles SPA route rewrites, so refreshing pages like `/hospital/dashboard` will work smoothly without 404s!

---

### Step 4: Final Connection (CORS & Links)

Now that you have your live Vercel URL (e.g., `https://blood-bridge.vercel.app`):
1. Go back to your **Render Dashboard** → `bloodbridge-backend` → **Environment**.
2. Update:
   - `FRONTEND_URL`: `https://blood-bridge.vercel.app`
   - `CORS_ORIGINS`: `https://blood-bridge.vercel.app`
3. Click **Save Changes**. Render will automatically redeploy with the new CORS settings.
4. Open your Vercel URL in your browser and test registration, login, and dashboard navigation!

---

## Option 2: Full-Stack Deployment on Railway

If you prefer a single platform for both services:

1. Log in to [Railway.app](https://railway.app).
2. Click **New Project** → **Deploy from GitHub repo**.
3. **Backend Service**:
   - Add service from repo → set root directory to `/backend`.
   - Railway will auto-detect Python.
   - Add environment variables (same as Render above).
   - In Settings → Networking, click **Generate Domain**.
4. **Frontend Service**:
   - In the same project, click **+ New** → **GitHub Repo** → select the same repo.
   - Set root directory to `/frontend`.
   - Set Build Command: `npm run build`.
   - Set Start Command: `npm run preview -- --port $PORT --host 0.0.0.0` or serve static dist via Nginx/Caddy.
   - Add `VITE_API_BASE_URL` with your Railway backend domain.
   - In Settings → Networking, click **Generate Domain**.

---

## Option 3: Self-Hosting with Docker / VPS

For VPS servers (Ubuntu 22.04 / 24.04 on DigitalOcean, AWS EC2, Hetzner, Linode):

1. **Install Docker and Docker Compose on your server**:
   ```bash
   sudo apt-get update
   sudo apt-get install -y docker.io docker-compose-plugin
   ```

2. **Clone your repository**:
   ```bash
   git clone https://github.com/<your-username>/BloodBridge.git
   cd BloodBridge
   ```

3. **Configure Environment Variables**:
   Create a root `.env` file or export variables:
   ```bash
   # Generate secret key
   SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")

   cat <<EOF > .env
   MONGODB_URL=mongodb://mongodb:27017
   DATABASE_NAME=bloodbridge
   SECRET_KEY=$SECRET_KEY
   FRONTEND_URL=http://your-server-ip:3000
   CORS_ORIGINS=http://your-server-ip:3000
   VITE_API_BASE_URL=http://your-server-ip:8000
   EOF
   ```

4. **Launch with Docker Compose**:
   ```bash
   docker compose up -d --build
   ```

5. **Verify Running Containers**:
   ```bash
   docker compose ps
   ```
   - Frontend is running on `http://your-server-ip:3000`
   - Backend API is running on `http://your-server-ip:8000`
   - Backend health check: `curl http://your-server-ip:8000/health`

---

## Common Troubleshooting & FAQ

### 1. CORS Error: "Access to fetch has been blocked by CORS policy"
- **Cause**: Backend does not recognize the origin of the frontend.
- **Fix**: In your backend environment variables (Render/Railway), ensure `CORS_ORIGINS` contains your exact frontend URL (e.g. `https://blood-bridge.vercel.app`, no trailing slash) or set `CORS_ORIGINS=*` during testing.

### 2. "Cannot connect to MongoDB / ServerSelectionTimeoutError"
- **Cause**: MongoDB Atlas IP whitelist is blocking the connection.
- **Fix**: In MongoDB Atlas → **Network Access**, ensure `0.0.0.0/0` is added. Also check that your database username and password in `MONGODB_URL` are correct.

### 3. Page Refresh Gives 404 on Vercel or Netlify
- **Cause**: The web server is looking for a physical file instead of routing to `index.html`.
- **Fix**: Handled automatically by [`frontend/vercel.json`](file:///d:/Projects/Blood%20Bridge/frontend/vercel.json) and [`frontend/public/_redirects`](file:///d:/Projects/Blood%20Bridge/frontend/public/_redirects).

### 4. Firebase Push Notifications Not Working
- **Cause**: Missing service account credentials on backend or missing VAPID key on frontend.
- **Fix**:
  - The backend safely operates with push notifications disabled if credentials are missing.
  - To enable push notifications in production, paste your entire Firebase service account JSON into the `FIREBASE_CREDENTIALS_JSON` environment variable on Render.

### 5. Render Free Tier Sleep
- Free Render Web Services spin down after 15 minutes of inactivity. The first request after sleep may take ~30-50 seconds to boot up.
- You can keep it warm using a free monitor like [UptimeRobot](https://uptimerobot.com) pinging `https://your-backend.onrender.com/health` every 10 minutes.
