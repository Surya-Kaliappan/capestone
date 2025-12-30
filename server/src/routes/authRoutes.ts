import { Router } from 'express';
import { signup, login, getProfile, getMyVault } from '../controllers/authController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', getProfile);
router.get('/vault', authenticateToken, getMyVault);

export default router;