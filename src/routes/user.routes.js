import express from 'express';
import { register, login, getProfile,logout, updatePreferences } from "../controllers/user.controller.js";

import { isauth } from '../middleware/userAuth.js';

const router = express.Router();
router.post('/register', register);
router.post('/login', login);
router.post('/logout', isauth, logout);
router.get('/profile', isauth, getProfile);
router.put('/preferences', isauth, updatePreferences);

export default router;