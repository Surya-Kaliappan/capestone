import { Request, Response } from 'express';
import { Agreement } from '../models/Agreement';
import { Message } from '../models/Message'; 

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
      content: `📜 New Agreement Proposal: ${title}`,
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