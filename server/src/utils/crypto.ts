// src/utils/crypto.ts
import { createCipheriv, createDecipheriv, scryptSync, randomBytes } from 'crypto';

/**
 * Derives a unique key for the agreement using its ID and its Blockchain-stored Hash.
 */
const deriveAgreementKey = (agreementId: string, contentHash: string) => {
  // We use the contentHash as the "secret" and the ID as the "salt"
  return scryptSync(contentHash, agreementId, 32); 
};

export const encryptContent = (content: string, agreementId: string, contentHash: string) => {
  const key = deriveAgreementKey(agreementId, contentHash);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(content, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return {
    encryptedBlob: encrypted,
    iv: iv.toString('hex'),
    authTag: cipher.getAuthTag().toString('hex')
  };
};

export const decryptContent = (encryptedBlob: string, agreementId: string, contentHash: string, ivHex: string, authTagHex: string) => {
  const key = deriveAgreementKey(agreementId, contentHash);
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  
  let decrypted = decipher.update(encryptedBlob, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};