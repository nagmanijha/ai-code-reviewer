// routes/ai.routes.js
import express from 'express';
import { getReview } from '../controllers/ai.controller.js';
import { isauth } from '../middleware/userAuth.js';
const router = express.Router();


router.post("/get-review", isauth, getReview);

export default router;