// The Base URL for your Backend
// When you deploy, you just change this ONE line.
export const SERVER_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

// Derived URLs
export const API_BASE_URL = `${SERVER_URL}/api`;
export const SOCKET_URL = SERVER_URL;