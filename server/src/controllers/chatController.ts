import { Request, Response } from 'express';
import { Message } from '../models/Message';
import mongoose from 'mongoose';
import { User } from '../models/User';

export const getRecentContacts = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user?.userId;
    if (!currentUserId) {
       res.status(401).json({ message: "Unauthorized" });
       return;
    }

    const userIdObj = new mongoose.Types.ObjectId(currentUserId);

    const contacts = await Message.aggregate([
      // 1. Find all messages involving me
      { 
        $match: { 
          $or: [{ sender: userIdObj }, { recipient: userIdObj }] 
        } 
      },
      // 2. Sort by newest first
      { $sort: { timestamp: -1 } },
      // 3. Group by the "Other Person"
      {
        $group: {
          _id: {
            $cond: { if: { $eq: ["$sender", userIdObj] }, then: "$recipient", else: "$sender" }
          },
          lastMessage: { $first: "$content" },
          lastMessageTime: { $first: "$timestamp" }
        }
      },
      // 4. Join with User table to get Name/Email
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userDetails"
        }
      },
      { $unwind: "$userDetails" },
      // 5. Format the output
      {
        $project: {
          id: "$_id",
          name: "$userDetails.name",
          email: "$userDetails.email",
          lastMessage: 1,
          lastMessageTime: 1
        }
      },
      // 6. Final Sort
      { $sort: { lastMessageTime: -1 } }
    ]);

    // Format for frontend
    const formatted = contacts.map(c => ({
      id: c.id.toString(),
      name: c.name,
      email: c.email,
      lastMessage: c.lastMessage,
      timestamp: c.lastMessageTime,
      status: 'offline' // Will be updated by socket on frontend
    }));

    res.status(200).json({ contacts: formatted });

  } catch (error) {
    console.error("Recent Contacts Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const getMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user1, user2 } = req.query;

    if (!user1 || !user2) {
      res.status(400).json({ message: "Missing user IDs" });
      return;
    }

    const messages = await Message.find({
      $or: [
        { sender: user1, recipient: user2 },
        { sender: user2, recipient: user1 }
      ]
    }).sort({ timestamp: 1 }); // Oldest first

    res.status(200).json({ messages });
  } catch (error) {
    console.error("Get Messages Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const saveMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sender, recipient, content, tempId } = req.body; // Accept tempId

    // 1. DUPLICATE CHECK (Idempotency)
    // If we received a message with this specific tempId in the last 1 minute, ignore it.
    if (tempId) {
        const existing = await Message.findOne({
            sender,
            content,
            timestamp: { $gt: new Date(Date.now() - 60000) } // Check last 60 seconds
        });
        
        // If exact content and sender exists recently, assume it's a retry
        if (existing) {
             console.log("Duplicate message blocked by backend.");
             res.status(200).json({ message: "Duplicate skipped", data: existing });
             return;
        }
    }

    const newMessage = await Message.create({
      sender,
      recipient,
      content,
      timestamp: new Date(),
      status: 'sent'
    });

    res.status(201).json({ message: "Saved", data: newMessage });
  } catch (error) {
    console.error("Save Message Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const markMessagesAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { senderId, recipientId } = req.body;

    await Message.updateMany(
      { sender: senderId, recipient: recipientId, status: { $ne: 'read' } },
      { $set: { status: 'read' } }
    );

    res.status(200).json({ message: "Marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Error" });
  }
};