# Data files (hashed / secure only)

These files are created when you register, vote, or announce results. **Only hashed or encrypted data is stored** — no plain passwords or plain ballot content.

| File | Contents |
|------|----------|
| **users.json** | `roll`, `email`, `passwordHash` (bcrypt hash with salt), `role`, `hasVoted`. No OTP, no plain password. |
| **votes.json** | `voterRoll`, `candidate`, `signature` (HMAC hash for integrity), `encryptedPayload` (AES-256-GCM encrypted ballot). No plain ballot. |
| **announcement.json** | `results`, `announcedAt`, `signature` (HMAC hash for integrity). |

**Location:** `Voting portal/backend/data/`

Files are written after each registration, vote, seed-admin, and announce-results. Data persists across server restarts.
