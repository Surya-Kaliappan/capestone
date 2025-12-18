import { Router } from 'express';
import { getMessages, getRecentContacts, saveMessage, markMessagesAsRead } from '../controllers/chatController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

router.get('/history', authenticateToken, getMessages);
router.post('/send', authenticateToken, saveMessage);
router.get('/recent-contacts', authenticateToken, getRecentContacts);
router.post('/mark-read', authenticateToken, markMessagesAsRead);

export default router;