/**
 * Crypto Helpers - 23CSE313 Lab Evaluation
 * Implements: Key exchange, AES encryption/decryption, Digital signature (hash-based), Encoding (Base64)
 */
const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const IV_LEN = 16;
const SALT_LEN = 32;
const TAG_LEN = 16;
const KEY_LEN = 32;
const HMAC_ALGORITHM = "sha256";

/**
 * Key exchange / generation (evaluation: secure key generation)
 * Derives a symmetric key from password + salt using PBKDF2 (NIST recommended)
 */
function deriveKey(password, salt) {
  if (!salt) salt = crypto.randomBytes(SALT_LEN);
  const key = crypto.pbkdf2Sync(password, salt, 100000, KEY_LEN, "sha256");
  return { key, salt };
}

// Fixed salt for server-side vote encryption (deterministic key across restarts)
const FIXED_VOTE_SALT = crypto.createHash("sha256").update("university-voting-portal-salt").digest();
function deriveVoteKey(password) {
  return deriveKey(password, FIXED_VOTE_SALT).key;
}

/**
 * AES-256-GCM encryption (evaluation: encryption)
 */
function encrypt(plaintext, key) {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

/**
 * AES-256-GCM decryption (evaluation: decryption)
 */
function decrypt(ciphertextB64, key) {
  const buf = Buffer.from(ciphertextB64, "base64");
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const enc = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(enc) + decipher.final("utf8");
}

/**
 * Digital signature using hash (evaluation: data integrity & authenticity)
 * Signs payload with HMAC-SHA256; verifier can check integrity.
 */
function sign(payload, secretKey) {
  const data = typeof payload === "string" ? payload : JSON.stringify(payload);
  const hmac = crypto.createHmac(HMAC_ALGORITHM, secretKey);
  hmac.update(data);
  return hmac.digest("hex");
}

function verifySignature(payload, signature, secretKey) {
  const expected = sign(payload, secretKey);
  return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
}

/**
 * Encoding: Base64 encode/decode (evaluation: encoding technique)
 */
function encodeBase64(str) {
  return Buffer.from(str, "utf8").toString("base64");
}

function decodeBase64(b64) {
  return Buffer.from(b64, "base64").toString("utf8");
}

module.exports = {
  deriveKey,
  deriveVoteKey,
  encrypt,
  decrypt,
  sign,
  verifySignature,
  encodeBase64,
  decodeBase64,
  SALT_LEN,
};
