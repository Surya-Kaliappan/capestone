import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes';
import chatRoutes from './routes/chatRoutes';
import userRoutes from './routes/userRoutes';
import agreementRoutes from './routes/agreementRoutes';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/secure-agreement-app";

app.use(cors({
    origin: "http://10.184.130.236:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"]
}));
app.use(cookieParser());
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/users', userRoutes);
app.use('/api/agreements', agreementRoutes);

// --- SOCKET SERVER ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://10.184.130.236:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// const userSocketMap = new Map(); // Stores { userId: socketId }

interface UserSocket {
  socketId: string;
  status: 'online' | 'busy';
}

const userSocketMap = new Map<string, UserSocket>();

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId as string;

  if (userId && userId !== "undefined") {
    userSocketMap.set(userId, {socketId: socket.id, status: 'online'});
    console.log(`✅ User Online: ${userId} (Socket: ${socket.id})`);
    const onlineList = Array.from(userSocketMap.entries()).map(([id, data]) => ({
      id,
      status: data.status
    }));
    io.to(socket.id).emit("getOnlineUsers", onlineList);
    // io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));
    socket.broadcast.emit("userStatusChange", {userId, status: 'online'});
  }

  socket.on("setStatus", ({status}) => {
    if(userSocketMap.has(userId)){
      const entry = userSocketMap.get(userId);
      if(entry){
        entry.status = status;
        userSocketMap.set(userId, entry);
        io.emit("userStatusChange", {userId, status});
      }
    }
  });

  socket.on("markAsRead", ({senderId, recipientId}) => {
    const senderSocketId = userSocketMap.get(senderId)?.socketId;
    if(senderSocketId){
      io.to(senderSocketId).emit("messageRead", {recipientId});
    }
  });

  socket.on("disconnect", () => {
    if (userId) {
      userSocketMap.delete(userId);
      console.log(`User Disconnected: ${userId}`);
      io.emit("userStatusChange", {userId, status: 'offline'});
    }
  });

  // --- DEBUGGING AREA ---
  socket.on("sendMessage", async ({ recipientId, message, messageType, fileData }) => {
    const recipientSocket = userSocketMap.get(recipientId);

    if (recipientSocket) {
      // Pass the File Data to the Receiver!
      io.to(recipientSocket.socketId).emit("newMessage", {
        senderId: userId,
        message,
        messageType, 
        fileData,    
        timestamp: new Date().toISOString(),
        status: recipientSocket.status === 'online' ? 'delivered' : 'sent' 
      });
    }
  });

  socket.on("messageStatusUpdate", ({ messages, status, senderId }) => {
    const senderSocket = userSocketMap.get(senderId);
    
    // Notify the Sender: "Hey, these messages are now READ"
    if (senderSocket) {
      io.to(senderSocket.socketId).emit("messageStatusUpdated", { 
        messageIds: messages, 
        status 
      });
    }
  });
});

mongoose.connect(DATABASE_URL)
    .then(() => {
        console.log("✅ MongoDB Connected Successfully");
        server.listen(PORT, () => {
            console.log(`🚀 Server running at http://localhost:${PORT}`);
        });
    })
    .catch((err) => console.error("❌ Database Connection Error:", err));