import express from 'express';
import multer from 'multer';
import { generateQuizFromPDF } from '../controllers/quiz.controller.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/generate', upload.single('document'), generateQuizFromPDF);

export default router;