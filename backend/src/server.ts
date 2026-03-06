import 'dotenv/config';
import app from './app';
import pool from './config/database';
import redis from './config/redis';

const PORT = parseInt(process.env.PORT || '5000', 10);

async function startServer() {
  try {
    // Test DB connection
    const client = await pool.connect();
    client.release();
    console.log('PostgreSQL connected');

    // Test Redis (already handles its own connect event)
    await redis.ping();

    app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
