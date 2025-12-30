import forge from 'node-forge';

export const generateIdentityClient = () => {
  // 1. Generate Keypair (RSA 2048 is widely supported by forge)
  const keys = forge.pki.rsa.generateKeyPair(2048);
  
  // 2. Convert to PEM format
  const publicKeyPem = forge.pki.publicKeyToPem(keys.publicKey);
  const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
  
  return { publicKeyPem, privateKeyPem };
};

/**
 * Encrypts the private key using the sealing password (Client-Side)
 */
export const encryptPrivateKeyClient = (privateKeyPEM: string, sealingPassword: string) => {
  // 1. Setup random parameters
  const salt = forge.random.getBytesSync(16);
  const iv = forge.random.getBytesSync(12);
  
  // 2. Derive 32-byte key using SHA-256
  const key = forge.pkcs5.pbkdf2(
    sealingPassword, 
    salt, 
    10000, 
    32, 
    forge.md.sha256.create()
  );

  // 3. Encrypt via AES-GCM
  const cipher = forge.cipher.createCipher('AES-GCM', key);
  cipher.start({ iv: forge.util.createBuffer(iv) });
  cipher.update(forge.util.createBuffer(privateKeyPEM, 'utf8'));
  cipher.finish();
  
  const authTag = cipher.mode.tag;

  return {
    encryptedData: forge.util.bytesToHex(cipher.output.getBytes()),
    iv: forge.util.bytesToHex(iv),
    salt: forge.util.bytesToHex(salt),
    authTag: forge.util.bytesToHex(authTag.getBytes())
  };
};

/**
 * Decrypts the private key using the sealing password entirely in the browser.
 */
export const decryptPrivateKeyClient = (
  encryptedDataHex: string, 
  sealingPassword: string, 
  ivHex: string, 
  saltHex: string, 
  authTagHex: string
): string => {
  const salt = forge.util.hexToBytes(saltHex);
  const iv = forge.util.hexToBytes(ivHex);
  const tag = forge.util.hexToBytes(authTagHex);
  const encryptedData = forge.util.hexToBytes(encryptedDataHex);

  const key = forge.pkcs5.pbkdf2(
    sealingPassword, 
    salt, 
    10000, 
    32, 
    forge.md.sha256.create()
  );

  const decipher = forge.cipher.createDecipher('AES-GCM', key);
  decipher.start({ 
    iv: forge.util.createBuffer(iv), 
    tag: forge.util.createBuffer(tag) 
  });
  
  decipher.update(forge.util.createBuffer(encryptedData));
  const pass = decipher.finish();
  
  if (!pass) {
    throw new Error("Incorrect Sealing Password or corrupted vault data.");
  }

  return decipher.output.toString();
};

export const signContentClient = (privateKeyPem: string, content: string): string => {
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
  const md = forge.md.sha256.create();
  md.update(content, 'utf8');
  const signature = privateKey.sign(md);
  return forge.util.bytesToHex(signature);
};