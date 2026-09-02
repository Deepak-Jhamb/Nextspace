# 🚀 NexusHub — Real-Time Collaborative Workspace SaaS Platform

NexusHub is a modern, full-stack MERN (MongoDB, Express, React, Node.js) collaborative platform. It features team management, role-based access control (RBAC), cloud storage & drive, Slack-like text channels with paginated messaging, Mesh WebRTC group video calling, live online presence, and Razorpay tier-based subscriptions.

---

## 🛠 Features & Technology Stack

### **Frontend (`/client`)**
* **Framework**: React 18 + Vite
* **Styling**: TailwindCSS + Lucide Icons + Glassmorphism UX
* **State Management**: React Context (`AuthContext`, `WorkspaceContext`, `CallContext`)
* **Real-Time Communication**: Socket.IO Client + WebRTC Mesh Signaling
* **HTTP Client**: Axios with request/response interceptors (auto Bearer token & 401 redirect)
* **Payment Gateway**: Razorpay Checkout SDK

### **Backend (`/server`)**
* **Runtime**: Node.js + Express
* **Database**: MongoDB with Mongoose ORM
* **Real-Time Gateway**: Socket.IO with JWT authentication & workspace rooms
* **Storage Provider**: Supabase Storage Integration with local filesystem fallback
* **Security & Hardening**:
  * Helmet HTTP Headers
  * Express Rate Limiting (`authRateLimiter`, `uploadRateLimiter`, `generalRateLimiter`)
  * `express-validator` input validation
  * Winston & Morgan file logging (`logs/error.log`, `logs/combined.log`)
  * Standardized Error Payload `{ success: false, message, errors: [] }`
* **Billing**: Razorpay Orders, HMAC Signature Verification & Webhooks

---

## 📁 Repository Structure

```text
NexusHub/
├── client/                      # React + Vite Frontend
│   ├── src/
│   │   ├── components/          # Call, Chat, Layout, Storage, Workspace UI
│   │   ├── context/             # AuthContext, WorkspaceContext, CallContext
│   │   ├── hooks/               # Custom React hooks
│   │   ├── pages/               # Dashboard, Files, Chat, Members, Meetings, Billing
│   │   └── services/            # Axios API config
│   ├── package.json
│   └── vite.config.js
│
├── server/                      # Node.js + Express Backend
│   ├── config/                  # DB, Socket.IO, Supabase, Winston Logger
│   ├── controllers/             # Auth, Workspace, File, Channel, Message, Meeting, Billing
│   ├── middleware/              # Auth, RBAC, Upload Quota, Rate Limiters, Errors
│   ├── models/                  # User, Workspace, File, Channel, Message, Meeting, Subscription
│   ├── routes/                  # REST API Endpoints
│   ├── logs/                    # Error and Access Log files
│   └── server.js                # Server Entry Point
│
├── docs/                        # Architecture & Token Storage documentation
└── README.md
```

---

## ⚙️ Local Environment Setup

### 1. Prerequisites
* **Node.js**: v18.0.0 or higher
* **MongoDB**: Local MongoDB instance running on `mongodb://localhost:27017/nexushub` or MongoDB Atlas URI

### 2. Environment Variables

Create `.env` inside `server/`:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGO_URI=mongodb://localhost:27017/nexushub
JWT_SECRET=super_secret_jwt_key_nexushub_2026_production_secure

# Optional Supabase Cloud Storage (Leave blank to use local filesystem fallback)
SUPABASE_URL=
SUPABASE_KEY=
SUPABASE_BUCKET=nexushub-files

# Razorpay Payment Gateway Credentials
RAZORPAY_KEY_ID=rzp_test_placeholder_key
RAZORPAY_KEY_SECRET=rzp_test_placeholder_secret
RAZORPAY_WEBHOOK_SECRET=
```

---

### 3. One-Click Execution ⚡

Simply double-click or run the launcher script for your platform:

* **Windows (Batch File)**: Double click `run.bat`
* **Windows (PowerShell)**: `.\run.ps1`
* **macOS / Linux**: `./start.sh`
* **Root Terminal Command**: `npm run dev`

This automatically verifies dependencies and launches both services simultaneously:
* **Backend API & WebSockets**: `http://localhost:5000`
* **Frontend App**: `http://localhost:5173`

---

### Manual Execution (Alternative)

---

## 🚢 Deployment Guide

### Deploying Frontend (`/client`) to Vercel / Netlify
1. Connect your GitHub repository to Vercel / Netlify.
2. Set Root Directory to `client`.
3. Set Build Command to `npm run build`.
4. Set Output Directory to `dist`.
5. Add Environment Variable:
   ```env
   VITE_API_URL=https://your-backend-api.onrender.com/api
   ```

### Deploying Backend (`/server`) to Render / Railway / PM2
1. Create a Web Service pointing to `/server`.
2. Build Command: `npm install`
3. Start Command: `node server.js`
4. Set Production Environment Variables:
   * `NODE_ENV=production`
   * `MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/nexushub`
   * `JWT_SECRET=<64-char-random-string>`
   * `CLIENT_URL=https://your-frontend.vercel.app`
   * `RAZORPAY_KEY_ID=<your_live_key>`
   * `RAZORPAY_KEY_SECRET=<your_live_secret>`

---

## 💳 Subscription Plan Tiers

| Tier | Price | Storage Quota | Member Limit | Max File Upload |
| :--- | :--- | :--- | :--- | :--- |
| **FREE** | ₹0 / $0 | 1 GB | 5 Members | 25 MB |
| **PRO** | ₹1,499 / $19 | 100 GB | 20 Members | 500 MB |
| **TEAM** | ₹3,999 / $49 | 500 GB | 100 Members | 2 GB |

---

## 🔒 Security & Architecture Decisions
For details on JWT Token Storage Architecture (Bearer Header vs HttpOnly Cookie) and CSRF/XSS defenses, read [`docs/TOKEN_STORAGE.md`](./docs/TOKEN_STORAGE.md).
