import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import quizRoutes from './routes/quiz.routes.js';
import './config/db.js'; // Import để kích hoạt test kết nối DB khi chạy server

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/quiz', quizRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend Server đang chạy tại http://localhost:${PORT}`));