import { Request, Response } from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { registerBlockchainUser } from '../services/blockchainAuth';

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_jwt_key_12345";

export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, clientIdentity } = req.body; 
    // clientIdentity contains { publicKey, encryptedPrivateKey, iv, salt, authTag }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: "User already exists" });
      return;
    }

    const hashedPassword = await argon2.hash(password);

    const user = await User.create({
      email,
      password: hashedPassword,
      name,
      fabricIdentity: clientIdentity // Store directly
    });

    console.log(`[Auth] Registering user ${user._id} on Fabric CA...`);
    try {
      await registerBlockchainUser(user._id.toString());
    } catch (error) {
      console.error("Blockchain Registration Failed: ", error);
    }

    // 6. Generate JWT (HttpOnly Cookie)
    const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('jwt', token, {
      httpOnly: true, // Prevents XSS attacks
      secure: false,  // Set to true in production (HTTPS)
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json({ 
      message: "User created successfully", 
      user: { id: user._id, email: user.email, name: user.name } 
    });

  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // 1. Find User
    const user = await User.findOne({ email });
    if (!user) {
      res.status(400).json({ message: "Invalid credentials email" });
      return;
    }

    // 2. Check Password
    const validPassword = await argon2.verify(user.password, password);
    if (!validPassword) {
      res.status(400).json({ message: "Invalid credentials password" });
      return;
    }

    // 3. Generate JWT
    const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('jwt', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({ 
      message: "Login successful", 
      user: { id: user._id, email: user.email, name: user.name } 
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.cookies.jwt;
    if (!token) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({ 
      user: { id: user._id, email: user.email, name: user.name } 
    });

  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

export const getMyVault = async (req: Request, res: Response) => {
  try {
    const user = await User.findById((req as any).user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    
    res.json(user.fabricIdentity);
  } catch (error) {
    res.status(500).json({ message: "Error fetching vault" });
  }
};