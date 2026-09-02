# NexusHub Authentication Architecture & Token Storage Decision

## Overview
NexusHub uses JSON Web Tokens (JWT) signed with HMAC SHA-256 for user authentication across HTTP REST API endpoints and real-time Socket.IO WebSockets.

---

## Token Storage Architecture: Bearer Header vs. HttpOnly Cookie

### Selected Approach: Bearer Token in `Authorization` Header

In NexusHub, JWT tokens are issued upon registration or login and attached to outgoing API requests using the HTTP `Authorization` header:

```http
Authorization: Bearer <JWT_TOKEN>
```

---

## Rationale & Architectural Decisions

### 1. Seamless WebSockets & Real-Time Connection
* **Challenge**: Socket.IO handshakes often struggle with cross-domain HttpOnly cookies, especially when client and server are hosted on separate subdomains or platforms (e.g., Vercel + Render).
* **Solution**: The Bearer token is passed directly in the Socket.IO `auth: { token }` handshake payload. This ensures instant authentication when joining workspace rooms and WebRTC mesh video sessions.

### 2. Immunity to Cross-Site Request Forgery (CSRF)
* Standard cookie-based authentication is vulnerable to CSRF attacks where malicious third-party websites trigger browser requests with attached cookies.
* `Authorization: Bearer <token>` headers are **never automatically attached** by browsers, rendering NexusHub immune to CSRF attacks without requiring complex anti-CSRF token synchronization.

### 3. XSS (Cross-Site Scripting) Defense Strategy
To safeguard against XSS vulnerabilities when holding tokens in client memory:
1. **React Auto-Escaping**: React DOM automatically escapes string content in JSX, preventing script injection.
2. **Strict Helmet Security Headers**: `helmet()` middleware configures Content-Security-Policy (CSP), X-Content-Type-Options, and X-XSS-Protection.
3. **Input Sanitization**: `express-validator` sanitizes and validates all incoming payload fields before saving to MongoDB.

---

## Production Security Checklists
* `JWT_SECRET` must be a high-entropy 64-character random key in production `.env`.
* HTTPS must be enforced across all API endpoints and WebSocket endpoints (`wss://`).
