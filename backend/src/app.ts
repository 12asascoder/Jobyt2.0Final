import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import routes from './routes';
import { errorHandler, notFound } from './middleware/errorHandler';
import { requestLogger } from './middleware/logger.middleware';

const app = express();

// Local resume/photo storage (STORAGE_TYPE=local); S3 URLs are absolute and do not use this
if ((process.env.STORAGE_TYPE || '').toLowerCase() === 'local') {
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
}

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  }),
);

// Rate limiting
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, message: 'Too many requests, please try again later.' },
  }),
);

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
