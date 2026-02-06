# University Voters Portal – Security Design (23CSE313 Lab Evaluation 1)

This document maps the application to the lab evaluation components: Authentication, Authorization (Access Control), Encryption, Hashing & Digital Signature, and Encoding.

---

## 1. Authentication (NIST SP 800-63-2 E-Authentication)

- **Single-Factor Authentication (1.5m)**  
  Username (Roll No) + password login. Passwords are verified against stored hashes (bcrypt). Tokens (JWT) are used for session management.

- **Multi-Factor Authentication (1.5m)**  
  Two factors: (1) password, (2) OTP. After successful password check, a 6-digit OTP is generated and stored with expiry (5 min). User must submit correct OTP to receive JWT. OTP is logged to server console in development.

- **NIST SP 800-63-2 alignment**  
  Registration and login follow an e-authentication style model: identity binding at registration (roll, email, password), secure credential storage (hashing with salt), and token-based authentication with a second factor (OTP).

**Code:** `server.js` – `/register`, `/login`, `/verify-otp`.

---

## 2. Authorization – Access Control (3m)

- **Access Control Model (ACL)**  
  Access Control List with **3 subjects** and **4 objects**:

  | Subject  | vote | results | announce | users |
  |----------|------|---------|----------|-------|
  | student  | ✓    | ✗       | ✗        | ✗     |
  | admin    | ✓    | ✓       | ✓        | ✓     |
  | guest    | ✗    | ✗       | ✗        | ✗     |

- **Policy & justification**  
  - **Student:** Can only cast one vote (least privilege; no access to counts or announce).  
  - **Admin:** Can view vote count, announce results, and manage users (election management).  
  - **Guest:** No authenticated access.

- **Implementation**  
  Permissions are enforced in code: `requireAuth` + `requirePermission(object)` middleware. Each protected route is bound to one object (e.g. `/vote` → `OBJECTS.VOTE`, `/results` → `OBJECTS.RESULTS`, `/announce-results` → `OBJECTS.ANNOUNCE`). Students calling `/results` or `/announce-results` receive 403 Forbidden.

**Code:** `accessControl.js` (ACL, `checkPermission`), `server.js` (middleware and route guards).

---

## 3. Encryption (3m)

- **Key exchange / key generation (1.5m)**  
  Symmetric key for vote encryption is derived using **PBKDF2** (NIST-recommended): password (master secret) + fixed salt, 100,000 iterations, SHA-256, 32-byte key. Same key is used for all vote encryption/decryption on the server.

- **Encryption & decryption (1.5m)**  
  **AES-256-GCM**: vote payload (voter roll, candidate, timestamp) is encrypted before storage. IV and auth tag are stored with the ciphertext. Decryption uses the same derived key (used for verification/audit if needed).

**Code:** `cryptoHelpers.js` – `deriveVoteKey`, `encrypt`, `decrypt`; `server.js` – vote creation using `encrypt(..., voteEncKey)`.

---

## 4. Hashing & Digital Signature (3m)

- **Hashing with salt (1.5m)**  
  Passwords are stored using **bcrypt** (built-in salt per password, configurable cost). No plaintext passwords are stored.

- **Digital signature using hash (1.5m)**  
  **HMAC-SHA256** is used for integrity and authenticity:  
  - Each stored vote has a `signature` over the ballot (voterRoll, candidate, ts).  
  - Announced results are signed (payload: results + announcedAt); clients can verify using the same secret.  
  Verification is done with `verifySignature` (timing-safe compare).

**Code:** `cryptoHelpers.js` – `sign`, `verifySignature`; `server.js` – vote creation, announcement creation and `/announced-results` verification.

---

## 5. Encoding (3m)

- **Encoding & decoding (1m)**  
  **Base64** is used: the API exposes an optional `/api/encoded-token` endpoint that returns Base64-encoded and decoded forms of the auth token (demonstrates encode/decode implementation).

**Code:** `cryptoHelpers.js` – `encodeBase64`, `decodeBase64`; `server.js` – `/api/encoded-token`.

- **Security levels & risks / possible attacks (theory)**  
  Discuss in viva: threat model (e.g. credential theft, MITM, privilege escalation), use of HTTPS in production, secure storage of keys, and why MFA and ACL limit impact of stolen passwords.

---

## Quick Reference – Evaluation vs Implementation

| Component              | Sub-component           | Implementation                          |
|------------------------|-------------------------|-----------------------------------------|
| 1. Authentication      | Single-factor           | Roll + password login                   |
|                        | Multi-factor            | Password + OTP                          |
| 2. Authorization       | ACL (3 subjects, 3+ obj)| student, admin, guest × vote, results, announce, users |
|                        | Policy & justification  | This document + comments in `accessControl.js` |
|                        | Programmatic enforcement| `requireAuth` + `requirePermission()`   |
| 3. Encryption          | Key exchange/generation | PBKDF2 key derivation                   |
|                        | Encrypt/decrypt         | AES-256-GCM for vote payload            |
| 4. Hashing & signature | Hashing with salt       | bcrypt for passwords                     |
|                        | Digital signature       | HMAC-SHA256 on vote & announced results |
| 5. Encoding            | Encode/decode           | Base64 (e.g. `/api/encoded-token`)      |

---

## How to Run

1. **Backend:**  
   `cd backend` → `npm install` → `npm start`. **No MongoDB** — uses in-memory storage.

2. **Create admin (once):**  
   From the frontend click “Seed Admin (dev)” or:  
   `curl -X POST http://localhost:3000/seed-admin`  
   Default admin: roll `admin1`, password `Admin@123`, admin key `ADMIN@2025`.

3. **Frontend:**  
   Open `index.html` in a browser (or serve the folder with a static server).  
   Register as a student → Login (Roll + password) → Enter OTP → Vote.  
   Login as admin (Roll + password + Admin Key) → OTP → View vote count → Announce results.

4. **Announced results:**  
   Anyone can open `/announced-results` (or the welcome page) to see results after admin has announced them.
