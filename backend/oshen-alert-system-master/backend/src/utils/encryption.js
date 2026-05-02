/**
 * Server-side AES-256-GCM encryption for sensitive settings (e.g. API keys).
 *
 * The encryption key is derived from JWT_SECRET using scrypt — it never leaves
 * the server.  Only the ciphertext (IV + auth tag + encrypted value, all hex)
 * is stored in the database.
 *
 * Security properties:
 *   • Each encryption uses a random 16-byte IV → same plaintext produces
 *     different ciphertext every time.
 *   • GCM auth tag prevents tampering with the stored ciphertext.
 *   • The actual API key is NEVER returned to the frontend — only a masked
 *     version (first-segment + ****-****-****-last-segment).
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // bytes (256 bits)
const IV_LENGTH = 16;  // bytes
const SALT = 'oshen-settings-v1'; // static salt — ok because the key is strong

let _derivedKey = null;

function _getKey() {
  if (_derivedKey) return _derivedKey;
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET must be set to use encrypted settings');
  _derivedKey = crypto.scryptSync(secret, SALT, KEY_LENGTH);
  return _derivedKey;
}

/**
 * Encrypt a plaintext string.
 * Returns a single string: "<ivHex>:<authTagHex>:<ciphertextHex>"
 */
function encrypt(plaintext) {
  const key = _getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':');
}

/**
 * Decrypt a value produced by encrypt().
 * Throws if the ciphertext has been tampered with.
 */
function decrypt(stored) {
  const key = _getKey();
  const parts = stored.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted value format');
  const [ivHex, authTagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

/**
 * Return a masked version of an API key safe to send to the frontend.
 * UUID-format keys (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx) show first and last segment.
 * All other keys show first 4 and last 4 chars only.
 */
function maskKey(key) {
  if (!key || key.length < 8) return '****';
  const uuidParts = key.split('-');
  if (uuidParts.length === 5) {
    return `${uuidParts[0]}-****-****-****-${uuidParts[4]}`;
  }
  return `${key.substring(0, 4)}****${key.substring(key.length - 4)}`;
}

module.exports = { encrypt, decrypt, maskKey };