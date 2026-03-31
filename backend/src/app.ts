import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import routes from './routes';
import { errorHandler, notFound } from './middleware/errorHandler';
import { requestLogger } from './middleware/logger.middleware';

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://jobyt.in',
  'https://www.jobyt.in',
];

// Local resume/photo storage (STORAGE_TYPE=local); S3 URLs are absolute and do not use this
const storageType = (process.env.STORAGE_TYPE || 'local').toLowerCase();
if (storageType !== 's3') {
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
}

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Relax for development
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

// Stripe webhook needs raw body — must come BEFORE express.json()
app.use('/api/v1/payments/webhook/stripe', express.raw({ type: 'application/json' }));

// Body parsing for everything else
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Structured request logging
app.use(requestLogger);

// API routes
app.use('/api/v1', routes);

// 404 & error handlers
app.use(notFound);
app.use(errorHandler);

export default app;
