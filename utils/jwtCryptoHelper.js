const crypto = require('crypto');

// Secret key (use env variable in production)
const ENCRYPTION_KEY = process.env.CRYPTO_SECRET || 'ecommerce_super_secret_key_32byte';
const IV_LENGTH = 16;

/**
 * Encrypts a given payload (object or string) into a secure base64 string.
 * Used before signing JWTs to prevent exposing sensitive user info.
 */
const encryptPayload = (payload) => {
  try {
    const jsonString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
    let encrypted = cipher.update(jsonString);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (error) {
    console.error('Encryption Error:', error);
    throw new Error('Failed to encrypt payload');
  }
};

/**
 * Decrypts a given encrypted payload (base64 string) back to JSON object.
 * Used after verifying JWTs to extract actual user data.
 */
const decryptPayload = (encryptedPayload) => {
  try {
    const textParts = encryptedPayload.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    const decryptedString = decrypted.toString();
    return JSON.parse(decryptedString);
  } catch (error) {
    console.error('Decryption Error:', error);
    throw new Error('Failed to decrypt payload');
  }
};

module.exports = { encryptPayload, decryptPayload };
