import axios from 'axios';
import { API_BASE_URL } from '../config';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // IMPORTANT: Sends cookies (JWT) with every request
  headers: {
    'Content-Type': 'application/json',
  },
});