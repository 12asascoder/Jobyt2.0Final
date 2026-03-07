import 'dotenv/config';
import http from 'http';
import app from './app';
import pool from './config/database';
import redis from './config/redis';
import { initSocket } from './config/socket';

const PORT = parseInt(process.env.PORT || '5000', 10);

async function startServer() {
  try {
    // Test DB connection
    const client = await pool.connect();
    client.release();
    console.log('PostgreSQL connected');

    // Test Redis
    await redis.ping();

    // Create HTTP server (required for Socket.io)
    const httpServer = http.createServer(app);

    // Initialise Socket.io
    initSocket(httpServer);
    console.log('Socket.io initialised');

    httpServer.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
