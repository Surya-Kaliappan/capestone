import { Request, Response } from 'express';
import { Agreement } from '../models/Agreement';
import { Message } from '../models/Message'; 
import { User } from '../models/User';
import { ipfsSercive } from '../services/ipfsService';
import { blockchainService } from '../services/blockchainService';
import crypto from 'crypto';
import { decryptContent, encryptContent } from '../utils/crypto';
const forge = require('node-forge');
// Fetch all agreements for the current chat context
export const getAgreementsByChat = async (req: Request, res: Response) => {
  try {
    const { otherUserId } = req.params;
    const { since } = req.query; // <--- NEW PARAMETER
    const currentUserId = (req as any).user.userId;

    const query: any = {
      $or: [
        { initiator: currentUserId, recipient: otherUserId },
        { initiator: otherUserId, recipient: currentUserId }
      ]
    };

    // If 'since' is provided, only get items updated AFTER that time
    if (since && typeof since === 'string') {
        query.updatedAt = { $gt: new Date(since) };
    }

    const agreements = await Agreement.find(query).sort({ updatedAt: -1 });

    res.status(200).json({ success: true, agreements });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch agreements" });
  }
};

export const createProposal = async (req: Request, res: Response) => {
  try {
    const { recipientId, title, content } = req.body;
    const initiatorId = (req as any).user.userId;

    const agreement = await Agreement.create({
      agreementId: `AG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      initiator: initiatorId,
      recipient: recipientId,
      title,
      content,
      currentTurn: recipientId,
      status: 'proposed'
    });

    // Create a System Message in the database
    const systemMessage = await Message.create({
      sender: initiatorId,
      recipient: recipientId,
      content: `Agreement Proposal: ${title}`,
      messageType: 'agreement_proposal',
      timestamp: new Date()
    });

    // Return the message so frontend can emit socket event
    res.status(201).json({ success: true, agreement, systemMessage });
  } catch (error) {
    res.status(500).json({ message: "Failed to create proposal" });
  }
};

export const updateProposal = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content, title } = req.body;
    const userId = (req as any).user.userId;

    const agreement = await Agreement.findById(id);
    if (!agreement || agreement.status !== 'proposed') {
        return res.status(400).json({ message: "Invalid agreement state" });
    }

    if (agreement.currentTurn.toString() !== userId) {
        return res.status(403).json({ message: "It is not your turn to edit" });
    }

    agreement.content = content;
    agreement.title = title || agreement.title;
    
    // Flip turn
    agreement.currentTurn = (agreement.initiator.toString() === userId) 
        ? agreement.recipient 
        : agreement.initiator;
    
    await agreement.save();
    res.json({ success: true, agreement });
  } catch (error) {
    res.status(500).json({ message: "Update failed" });
  }
};

export const acceptProposal = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;

    const agreement = await Agreement.findById(id);
    if (!agreement || agreement.currentTurn.toString() !== userId) {
        return res.status(403).json({ message: "Unauthorized acceptance" });
    }

    agreement.status = 'pending_signature';
    await agreement.save();
    res.json({ success: true, agreement });
  } catch (error) {
    res.status(500).json({ message: "Acceptance failed" });
  }
};

export const recallProposal = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user.userId;
      const agreement = await Agreement.findById(id);
  
      if (!agreement) return res.status(404).json({ message: "Not found" });

      if (agreement.status !== 'pending_signature') {
        return res.status(409).json({
          message: "Active Failed: The agreement status has already been updated by the other party."
        });
      }
  
      agreement.status = 'proposed';
      agreement.signatures = []; 
      agreement.recallCount += 1;
      agreement.currentTurn = userId;
  
      await agreement.save();
      res.json({ success: true, message: "Proposal recalled", agreement });
    } catch (error) {
      res.status(500).json({ message: "Recall failed" });
    }
};

export const signAgreement = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { signature } = req.body;
    const userId = (req as any).user.userId;

    // 1. Fetch Agreement and User
    const agreement = await Agreement.findById(id);
    const user = await User.findById(userId);

    if (!agreement || agreement.status !== 'pending_signature') {
      return res.status(400).json({ message: "Agreement not ready for signing" });
    }
    if (!user) return res.status(404).json({ message: "User not found" });

    // 2. Validate Sealing Password by attempting to decrypt Private Key
    const publicKey = forge.pki.publicKeyFromPem(user.fabricIdentity?.publicKey);
    const md = forge.md.sha256.create();
    md.update(agreement.content, 'utf8');

    const isValid = publicKey.verify(md.digest().bytes(), forge.util.hexToBytes(signature));
    if(!isValid) return res.status(401).json({message: "Invalid Signature"});

    // 3. Prevent Double Signing
    const alreadySigned = agreement.signatures.find((s: any) => s.signerId.toString() === userId);
    if (alreadySigned) return res.status(400).json({ message: "You have already signed this agreement." });

    // 4. Generate Content Hash (Fingerprint)
    const contentHash = crypto.createHash('sha256').update(agreement.content).digest('hex');

    // 5. Add Local Signature Record
    agreement.signatures.push({
      signerId: userId,
      signedAt: new Date(),
      signatureValue: signature
    });

    // 6. If this is the FINAL signature, commit to Blockchain & IPFS
    if (agreement.signatures.length === 2) {

      const encrypted = encryptContent(agreement.content, agreement.agreementId, contentHash);
      const ipfsPayload = JSON.stringify(encrypted);

      // A. Upload to IPFS
      const cid = await ipfsSercive.uploadContent(ipfsPayload);

      await blockchainService.recordAgreement(
        userId,
        agreement.agreementId,
        cid,
        contentHash,
        agreement.signatures,
        agreement.version.toString(),
        agreement.parentId
      );

      agreement.status = 'active';
      agreement.content = "[SEALED ON BLOCKCHAIN]";
      agreement.signatures = [];
      
      // Create final system notification
      await Message.create({
        sender: userId,
        recipient: agreement.initiator.toString() === userId ? agreement.recipient : agreement.initiator,
        content: `Signed & Sealed: ${agreement.title}`,
        messageType: 'agreement_proposal'
      });
    }

    await agreement.save();
    res.status(200).json({ success: true, agreement });

  } catch (error) {
    console.error("Signing Error:", error);
    res.status(500).json({ message: "Failed to finalize agreement on-chain" });
  }
};

export const getAgreementContent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const agreement = await Agreement.findById(id);
    if (!agreement) return res.status(404).json({ message: "Agreement not found" });

    const ledgerData = await blockchainService.queryAgreement(
      (req as any).user.userId,
      agreement.agreementId,
    );
    const rawIpfsData = await ipfsSercive.retrieveContent(ledgerData.ipfsCid);
    const {encryptedBlob, iv, authTag} = JSON.parse(rawIpfsData);

    const content = decryptContent(encryptedBlob, agreement.agreementId, ledgerData.contentHash, iv, authTag);
    res.json({ content, verified: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch from IPFS" });
  }
};

export const amendAgreement = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const initiatorId = (req as any).user.userId;
    const { content } = req.body;

    const parentAgreement = await Agreement.findById(id);
    if(!parentAgreement || parentAgreement.status !== 'active'){
      return res.status(400).json({ message: "Only active agreements can be amended" });
    }

    const baseTitle = parentAgreement.title.replace(/\s\(v\d+\)$/, "");
    const newVersion = parentAgreement.version + 1;
    const newTitle = `${baseTitle} (v${newVersion})`;
    
    parentAgreement.status = 'archived';
    await parentAgreement.save();

    const recipientId = parentAgreement.initiator.toString() === initiatorId
                        ? parentAgreement.recipient
                        : parentAgreement.initiator;


    const amendment = await Agreement.create({
      agreementId: `AG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      version: parentAgreement.version + 1,
      parentId: parentAgreement.agreementId,
      initiator: initiatorId,
      recipient: recipientId,
      title: newTitle,
      content: content,
      currentTurn: recipientId,
      status: 'proposed'
    });


    const systemMessage = await Message.create({
      sender: initiatorId,
      recipient: recipientId,
      content: `Agreement Proposal: ${parentAgreement.title}`,
      messageType: 'agreement_proposal',
      timestamp: new Date()
    });

    res.status(201).json({ success: true, agreement: amendment, systemMessage });
  } catch (error) {
    res.status(500).json({ message: "Failed to create amendment version" });
  }
};

export const verifyPublicAgreement = async (req: Request, res: Response) => {
  try {
    const {agreementId} = req.params;

    console.log(`[Verify] Starting autopsy for : ${agreementId}`);

    let ledgerData;
    try {
      ledgerData = await blockchainService.queryAgreement('admin', agreementId);
    } catch (error) {
      return res.status(404).json({message: "Agreement not found on the ledger"});
    }
    // console.log("ledgerData : ",ledgerData);
    const rawIpfsData = await ipfsSercive.retrieveContent(ledgerData.ipfsCid);
    const { encryptedBlob, iv, authTag } = JSON.parse(rawIpfsData);
    // console.log("Ipfs : ",rawIpfsData);
    let decryptedContent = "";
    try {
      decryptedContent = decryptContent(encryptedBlob, agreementId, ledgerData.contentHash, iv, authTag);
    } catch (error) {
      return res.status(400).json({verified: false, error: "Decryption Failed: The content on IPFS does not match the Blockchain Hash"});
    }

    const freshHash = crypto.createHash('sha256').update(decryptedContent).digest('hex');
    const isContentTamperFree = (freshHash === ledgerData.contentHash);

    const verificationResults = await Promise.all(ledgerData.signatures.map(async (sig: any) => {
      const signer = await User.findById(sig.signerId);
      if(!signer || !signer.fabricIdentity){
        return {signerId: sig.signerId, name: "Unknow User", valid: false, error: "Public key nor found"};
      }

      try {
        const publicKey = forge.pki.publicKeyFromPem(signer.fabricIdentity.publicKey);
        const signatureBytes = forge.util.hexToBytes(sig.signatureValue);
        const digestBytes = forge.util.hexToBytes(ledgerData.contentHash);

        const isValid = publicKey.verify(digestBytes, signatureBytes);

        return {
          signerId: sig.signerId,
          name: signer.name,
          email: signer.email,
          signedAt: sig.signedAt,
          valid: isValid
        };
      } catch (error) {
        return {signerId: sig.signerId, name: signer.name, valid: false, error: "Crypto Verification Error"};
      }
    }));

    res.json({
        success: true,
        agreementId: ledgerData.agreementId,
        version: ledgerData.version,
        isContentTamperFree,
        content: decryptedContent,
        signatures: verificationResults,
        blockchainTimestamp: ledgerData.createdAt
    });
  } catch (error) {
    console.error("Verification Error:", error);
    res.status(500).json({ message: "Verification process failed due to internal error" });
  }
}