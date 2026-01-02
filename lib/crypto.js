import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

/**
 * Deriva uma chave a partir da chave mestre usando PBKDF2
 */
function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(
    password,
    salt,
    ITERATIONS,
    KEY_LENGTH,
    'sha512'
  );
}

/**
 * Criptografa um texto usando AES-256-GCM
 * @param {string} text - Texto a ser criptografado
 * @returns {string} Texto criptografado em formato base64
 */
export function encrypt(text) {
  if (!text) return '';

  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY não está definida no .env');
  }

  // Gera salt e IV aleatórios
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);

  // Deriva a chave a partir da chave mestre
  const key = deriveKey(encryptionKey, salt);

  // Criptografa
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Obtém a tag de autenticação
  const tag = cipher.getAuthTag();

  // Combina salt + iv + tag + encrypted e retorna em base64
  const combined = Buffer.concat([
    salt,
    iv,
    tag,
    Buffer.from(encrypted, 'hex')
  ]);

  return combined.toString('base64');
}

/**
 * Descriptografa um texto criptografado com AES-256-GCM
 * @param {string} encryptedText - Texto criptografado em base64
 * @returns {string} Texto original descriptografado
 */
export function decrypt(encryptedText) {
  if (!encryptedText) return '';

  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY não está definida no .env');
  }

  try {
    // Decodifica de base64
    const combined = Buffer.from(encryptedText, 'base64');

    // Extrai salt, iv, tag e dados criptografados
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = combined.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + TAG_LENGTH
    );
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    // Deriva a chave
    const key = deriveKey(encryptionKey, salt);

    // Descriptografa
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Erro ao descriptografar:', error);
    throw new Error('Falha ao descriptografar dados');
  }
}
