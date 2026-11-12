import express from 'express';
import cors from 'cors';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import quizRoutes from './routes/quiz.routes.js';
import meRoutes from './routes/me.routes.js';
import adminRoutes from './routes/admin.routes.js';
import libraryRoutes from './routes/library.routes.js';
import { errorHandler, HttpError, notFound } from './middleware/errors.js';

const app = express();

app.disable('x-powered-by');
// Vercel ghi đè X-Forwarded-For bằng IP thật của client (1 proxy). Chạy local: không tin header này.
app.set('trust proxy', process.env.VERCEL ? 1 : false);

// Token đi qua header Authorization (không cookie) → CORS chỉ để trình duyệt lạ không gọi được API.
const origins = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors({ origin: origins }));
app.use(express.json({ limit: '1mb' }));

app.use('/api/quiz', quizRoutes);

// shortcut: bộ đếm trong bộ nhớ, mỗi instance Vercel đếm riêng – đổi sang store dùng chung (vd Upstash) nếu bị lạm dụng.
// Khách: 60/phút/IP (API spec §9). Có token: hạn mức riêng cao hơn vì cả lớp có thể chung một IP NAT của trường.
const authed = (req) => req.get('authorization') !== undefined;
const limiter = rateLimit({
  windowMs: 60_000,
  limit: (req) => (authed(req) ? 600 : 60),
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${authed(req) ? 'auth' : 'guest'}`,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (req, res, next) => next(new HttpError(429, 'RATE_LIMITED', 'Bạn gửi quá nhiều yêu cầu, thử lại sau ít phút.')),
});
const v1 = express.Router();
v1.use(limiter);
v1.use('/me', meRoutes);
v1.use('/admin', adminRoutes);
v1.use(libraryRoutes);
app.use('/api/v1', v1);

app.use(notFound);
app.use(errorHandler);

export default app;
