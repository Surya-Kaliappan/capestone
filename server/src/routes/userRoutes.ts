import { Router } from 'express';
import { searchUsers } from '../controllers/userController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

router.get('/search', authenticateToken, searchUsers);

export default router;