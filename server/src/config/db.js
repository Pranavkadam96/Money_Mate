import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { MongoMemoryServer } from 'mongodb-memory-server';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let memoryServer = null;

export async function connectDB() {
  const configuredUri = process.env.MONGO_URI?.trim();

  if (configuredUri) {
    try {
      const conn = await mongoose.connect(configuredUri, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log(`MongoDB connected: ${conn.connection.host}`);
      return;
    } catch (err) {
      console.warn(`Could not connect to MONGO_URI (${err.message}). Falling back to persistent embedded MongoDB...`);
    }
  } else {
    // Try local default MongoDB first with a short timeout
    try {
      const conn = await mongoose.connect('mongodb://127.0.0.1:27017/moneymate', {
        serverSelectionTimeoutMS: 1500,
      });
      console.log(`Local MongoDB connected: ${conn.connection.host}`);
      return;
    } catch {
      // Fallback cleanly to persistent MongoMemoryServer
    }
  }

  const dbPath = path.resolve(__dirname, '../../data/db');
  fs.mkdirSync(dbPath, { recursive: true });

  memoryServer = await MongoMemoryServer.create({
    instance: {
      dbName: 'moneymate',
      dbPath,
      storageEngine: 'wiredTiger',
    },
  });

  const uri = memoryServer.getUri('moneymate');
  const conn = await mongoose.connect(uri);
  console.log(`Embedded persistent MongoDB connected (${dbPath}) at ${conn.connection.host}`);
}

export async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}
