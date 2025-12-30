import mongoose from "mongoose";

const agreementSchema = new mongoose.Schema({
  agreementId: { type: String, required: true, unique: true },
  version: { type: Number, required: true, default: 1 },

  parentId: { type: String, default: "ORIGINAL" },
  
  initiator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  title: { type: String, required: true },
  content: { type: String, required: true },
  
  status: { 
    type: String, 
    enum: [
      'proposed',           // Loop phase (editable)
      'pending_signature',  // Accepted content (locked)
      'active',             // Signed & on Blockchain
      'archived'            // Superseded by a newer version
    ],
    default: 'proposed'
  },

  // Turn management: Whose turn to Accept or Edit?
  currentTurn: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Tracking "Recall" events for corrections
  recallCount: { type: Number, default: 0 },

  signatures: [],

  blockchainTxId: { type: String },
  ipfsHash: { type: String },

}, { timestamps: true });

export const Agreement = mongoose.model("Agreement", agreementSchema);