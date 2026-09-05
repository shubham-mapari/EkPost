# 🚀 EkPost – Social Media Management & Scheduling Engine

**EkPost** हे एक modern social media management प्लॅटफॉर्म आहे, ज्याद्वारे एकाच क्लिकमध्ये LinkedIn (Personal + Page), Meta (Facebook Page + Instagram Business), आणि X (Twitter) वर पोस्ट्स पब्लिश आणि शेड्यूल करता येतात.

---

## 📁 Project Architecture & Structure

```text
EkPost/
├── src/
│   ├── config/
│   │   └── env.js                     # Centralized Environment config
│   ├── utils/
│   │   └── encryption.js              # AES-256-GCM Token Encryption/Decryption
│   ├── providers/                     # Social Media API Providers
│   │   ├── linkedin.provider.js       # LinkedIn /rest/posts & OAuth
│   │   ├── meta.provider.js           # Facebook Graph & Instagram Container API
│   │   ├── twitter.provider.js        # X API v2 Tweets
│   │   └── index.js
│   ├── services/                      # Business & Orchestration Layer
│   │   ├── account.store.js           # Account data & secure storage
│   │   ├── post.service.js            # Concurrent multi-platform publishing
│   │   └── scheduler.service.js       # Post scheduling & execution queue
│   ├── routes/
│   │   ├── api.routes.js              # REST endpoints (/api/posts, /api/accounts)
│   │   └── auth.routes.js             # OAuth Handlers (/auth/linkedin, /auth/meta)
│   ├── prisma/
│   │   └── schema.prisma              # PostgreSQL production schema
│   └── server.js                      # Express App entrypoint
├── public/                            # Web App & Live Previews Dashboard
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── .env.example
├── package.json
└── README.md
```

---

## ⚡ How to Run Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Dev Server
```bash
npm run dev
# किंवा
npm start
```

### 3. Open Web Dashboard
ब्राउझरमध्ये [http://localhost:5000](http://localhost:5000) उघडा.

---

## 🔑 Environment Variables Setup (`.env`)

```env
PORT=5000
NODE_ENV=development
APP_URL=http://localhost:5000

# AES-256-GCM Secret for Social Tokens
ENCRYPTION_SECRET_KEY=9f8e7d6c5b4a3928170e9d8c7b6a5f4e3d2c1b0a9876543210abcdef01234567

# LinkedIn Developer Credentials
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
LINKEDIN_REDIRECT_URI=http://localhost:5000/auth/linkedin/callback

# Meta (Facebook & Instagram) Credentials
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
META_REDIRECT_URI=http://localhost:5000/auth/meta/callback

# X (Twitter) API v2 Credentials
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
TWITTER_REDIRECT_URI=http://localhost:5000/auth/twitter/callback
```

---

## 🛠️ Key Technical Features Implemented

1. **LinkedIn `/rest/posts` API:**
   - Supports both `urn:li:person:...` (Personal Profile) and `urn:li:organization:...` (Company Page).
   - Automatically handles text commentary and article media attachments.

2. **Meta Graph API (Facebook + Instagram):**
   - Facebook Page Feed and Photo API.
   - Instagram 2-Step Container Flow (`POST /{ig-user-id}/media` -> wait -> `POST /{ig-user-id}/media_publish`).

3. **AES-256-GCM Security:**
   - Any sensitive OAuth access token is encrypted before storage.

4. **Multi-Platform Live Previews:**
   - Real-time side-by-side feed preview for LinkedIn, Instagram, Facebook, and X (Twitter) with responsive character limit checks.
