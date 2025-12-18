import { generateKeyPairSync, randomBytes, createCipheriv, createDecipheriv, scryptSync } from 'crypto';

// 1. Generate a new Digital Identity (ECDSA - same as Hyperledger Fabric)
export const generateIdentity = () => {
  const { privateKey, publicKey } = generateKeyPairSync('ec', {
    namedCurve: 'prime256v1', // Standard for Fabric
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  return { privateKey, publicKey };
};

// 2. Derive a 32-byte Key from the Sealing Password (Salted)
const deriveKey = (password: string, salt: Buffer) => {
  // scrypt is memory-hard, making it very resistant to brute-force
  return scryptSync(password, salt, 32);
};

// 3. Encrypt the Private Key (The "Sealing" Process)
export const encryptPrivateKey = (privateKeyPEM: string, sealingPassword: string) => {
  const salt = randomBytes(16); // Random salt for key derivation
  const iv = randomBytes(12);   // Random Initialization Vector for AES-GCM
  
  const key = deriveKey(sealingPassword, salt);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(privateKeyPEM, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex'); // GCM Integrity Check

  return {
    encryptedData: encrypted,
    iv: iv.toString('hex'),
    salt: salt.toString('hex'),
    authTag: authTag
  };
};

// 4. Decrypt (For later use in Phase 5)
export const decryptPrivateKey = (encryptedData: string, sealingPassword: string, ivHex: string, saltHex: string, authTagHex: string) => {
  const salt = Buffer.from(saltHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const key = deriveKey(sealingPassword, salt);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted; // Returns the Raw PEM String
};