import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useAppStore } from "../store";
import io, { Socket } from "socket.io-client";
import { SOCKET_URL } from "../config";

interface UserStatus {
  id: string;
  status: 'online' | 'offline' | 'busy';
}

interface SocketContextType {
  socket: Socket | null;
  onlineUsers: Map<string, string>;
  updateMyStatus: (status: 'online' | 'busy') => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketContextProvider");
  }
  return context;
};

export const SocketContextProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Map<string, string>>(new Map());
  const { currentUser } = useAppStore();

  useEffect(() => {
    if (currentUser) {
      // USE CONFIG HERE
      const newSocket = io(SOCKET_URL, {
        query: { userId: currentUser.id },
      });

      setSocket(newSocket);

      // ... (Rest of listeners remain exactly the same)
      newSocket.on("getOnlineUsers", (users: UserStatus[]) => {
        const userMap = new Map();
        users.forEach(u => userMap.set(u.id, u.status));
        setOnlineUsers(userMap);
      });

      newSocket.on("userStatusChange", ({userId, status}: {userId: string, status: string}) => {
        setOnlineUsers((prev) => {
          const newMap = new Map(prev);
          if(status === 'offline'){
            newMap.delete(userId);
          } else {
            newMap.set(userId, status);
          }
          return newMap;
        })
      });

      return () => { newSocket.close(); };
    } else {
      if (socket) { socket.close(); setSocket(null); }
    }
  }, [currentUser]);

  const updateMyStatus = (status: 'online' | 'busy') => {
    socket?.emit("setStatus", {status});
  };

  return (
    <SocketContext.Provider value={{ socket, onlineUsers, updateMyStatus }}>
      {children}
    </SocketContext.Provider>
  );
};