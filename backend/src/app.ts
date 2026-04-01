import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import routes from './routes';
import { errorHandler, notFound } from './middleware/errorHandler';
import { requestLogger } from './middleware/logger.middleware';

const app = express();

// Required when running behind a reverse proxy (e.g. Railway) so client IPs are resolved correctly.
app.set('trust proxy', 1);

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

// Razorpay webhook requires raw request body for signature verification.
app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));

// Body parsing for everything else
const jsonParser = express.json({ limit: '10mb' });
const urlencodedParser = express.urlencoded({ extended: true });

app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api/v1/payments/webhook')) {
    return next();
  }
  return jsonParser(req, res, next);
});

app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api/v1/payments/webhook')) {
    return next();
  }
  return urlencodedParser(req, res, next);
});

// Structured request logging
app.use(requestLogger);

// API routes
app.use('/api/v1', routes);

// 404 & error handlers
app.use(notFound);
app.use(errorHandler);

export default app;
