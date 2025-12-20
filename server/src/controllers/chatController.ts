import { Request, Response } from 'express';
import { Message } from '../models/Message';
import mongoose from 'mongoose';
import { User } from '../models/User';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        // Unique name: timestamp-random-originalName
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

export const uploadMiddleware = multer({ storage }).single('file');

export const uploadFile = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({ message: "No file uploaded" });
            return;
        }

        // Return the file info immediately. 
        // The actual "Message" creation happens when the frontend sends the message data via socket/api.
        // Or we can create it here. For WhatsApp style, we usually upload first, get ID, then send message.
        
        const fileUrl = `/uploads/${req.file.filename}`;
        
        res.status(200).json({
            url: fileUrl,
            name: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size
        });

    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ message: "Upload failed" });
    }
};

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
    // Read pagination params (defaults: limit 50, skip 0)
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = parseInt(req.query.skip as string) || 0;

    if (!user1 || !user2) {
      res.status(400).json({ message: "Missing user IDs" });
      return;
    }

    // 1. Count Total (to know if there are more)
    const totalMessages = await Message.countDocuments({
        $or: [
            { sender: user1, recipient: user2 },
            { sender: user2, recipient: user1 }
        ]
    });

    // 2. Fetch with Pagination (Sort DESC first to get newest, then reverse back)
    const messages = await Message.find({
      $or: [
        { sender: user1, recipient: user2 },
        { sender: user2, recipient: user1 }
      ]
    })
    .sort({ timestamp: -1 }) // Get newest first
    .skip(skip)
    .limit(limit)
    .populate('sender', 'name email')
    .populate('recipient', 'name email');

    // 3. Reverse back to chronological order (Oldest -> Newest)
    const formattedMessages = messages.reverse().map(msg => ({
      _id: msg._id,
      sender: (msg.sender as any)._id,
      recipient: (msg.recipient as any)._id,
      content: msg.content,
      messageType: msg.messageType,
      fileData: msg.fileData,
      timestamp: msg.timestamp,
      status: msg.status
    }));

    res.status(200).json({ 
        messages: formattedMessages,
        hasMore: totalMessages > (skip + limit) // Tell frontend if more exist
    });

  } catch (error) {
    console.error("Get Messages Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const saveMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Extract new fields (messageType, fileData)
    const { sender, recipient, content, messageType, fileData, tempId } = req.body; 

    // Duplicate Check (Idempotency)
    if (tempId) {
        const existing = await Message.findOne({
            sender,
            content,
            timestamp: { $gt: new Date(Date.now() - 60000) }
        });
        if (existing) {
             res.status(200).json({ message: "Duplicate skipped", data: existing });
             return;
        }
    }

    // 2. Create Message with File Data
    const newMessage = await Message.create({
      sender,
      recipient,
      content,
      messageType: messageType || 'text', // Default to text if missing
      fileData: fileData || undefined,    // Save file info
      timestamp: new Date(),
      status: 'sent'
    });

    const responseData = {
        ...newMessage.toObject(),
        timestamp: newMessage.timestamp.toISOString() 
    };

    res.status(201).json({ message: "Saved", data: responseData });
  } catch (error) {
    console.error("Save Message Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};