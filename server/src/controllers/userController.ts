import { Request, Response } from 'express';
import { User } from '../models/User';
import mongoose from 'mongoose';

export const searchUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query } = req.query;
    
    const currentUserId = req.user?.userId;
    if (!query || typeof query !== 'string') {
      res.status(400).json({ message: "Search query required" });
      return;
    }

    const searchFilter: any = {
      $or: [
        { email: { $regex: query, $options: 'i' }},
        { name: { $regex: query, $options: 'i' }}
      ]
    };

    if(currentUserId){
      searchFilter._id = { $ne: new mongoose.Types.ObjectId(currentUserId) };
    }

    // 2. Search Logic (Exclude Self)
    const users = await User.find(searchFilter).select('_id name email');

    const formattedUsers = users.map(u => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      status: 'offline' 
    }));

    res.status(200).json({ users: formattedUsers });

  } catch (error) {
    console.error("Search Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};