import express from 'express';
import { authenticateToken } from '../middlewares/authMiddleware';
import { 
    createProposal, updateProposal, acceptProposal, recallProposal, getAgreementsByChat, 
    signAgreement,
    getAgreementContent,
    amendAgreement
} from '../controllers/agreementController';

const router = express.Router();

router.get('/chat/:otherUserId', authenticateToken, getAgreementsByChat); // MISSING ROUTE ADDED
router.post('/create', authenticateToken, createProposal);
router.put('/:id/update', authenticateToken, updateProposal);
router.post('/:id/accept', authenticateToken, acceptProposal);
router.post('/:id/recall', authenticateToken, recallProposal);

router.post('/:id/sign', authenticateToken, signAgreement);
router.get('/:id/content', authenticateToken, getAgreementContent);
router.post('/:id/amend', authenticateToken, amendAgreement);

export default router;