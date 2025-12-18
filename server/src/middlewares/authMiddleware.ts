import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_jwt_key_12345";

// Extend Express Request type to include 'user'
declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; email: string };
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.cookies.jwt;

  if (!token) {
    // If we want to allow guests (optional), we just call next(). 
    // But for this app, we block them.
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    req.user = decoded; // <--- ATTACH USER TO REQUEST
    next(); // Pass to the next function (controller)
  } catch (err) {
    res.status(403).json({ message: "Invalid or expired token" });
  }
};