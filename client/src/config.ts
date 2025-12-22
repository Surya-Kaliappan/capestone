// The Base URL for your Backend
// When you deploy, you just change this ONE line.
export const SERVER_URL = "http://10.184.130.236:3000"; 

// Derived URLs
export const API_BASE_URL = `${SERVER_URL}/api`;
export const SOCKET_URL = SERVER_URL;

// App Constants
export const APP_NAME = "SecureAgreements";
export const CONNECTION_TIMEOUT = 10000; // 10 seconds