import express from 'express';
import userController from '../controllers/user.controller.js';
import { isauth } from '../middleware/userAuth.js';

const router = express.Router();
router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/logout', isauth, userController.logout);
router.get('/profile', isauth, userController.getProfile);

export default router;