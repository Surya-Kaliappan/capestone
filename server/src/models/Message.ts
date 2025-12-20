import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  recipient: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  content: { 
    type: String, 
  },
  messageType: {
    type: String,
    enum: ['text', 'file', 'agreement_proposal'], // <--- Future Proofing
    default: 'text'
  },
  fileData: {
    url: String,
    name: String,
    mimeType: String,
    size: Number
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  }
});

export const Message = mongoose.model('Message', messageSchema);