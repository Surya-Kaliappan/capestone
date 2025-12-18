import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    lowercase: true 
  },
  password: { 
    type: String, 
    required: true 
  }, // This is the LOGIN password (Argon2 hashed)
  
  name: { 
    type: String, 
    required: true 
  },
  
  // The "Fabric Identity" Vault
  fabricIdentity: {
    publicKey: { type: String, required: true }, // Visible to everyone
    encryptedPrivateKey: { type: String, required: true }, // The "Blob"
    iv: { type: String, required: true },
    salt: { type: String, required: true },
    authTag: { type: String, required: true }
  },

  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

export const User = mongoose.model('User', userSchema);