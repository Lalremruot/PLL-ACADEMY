import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose | null> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

const CONNECT_TIMEOUT_MS = 10000;

/**
 * Connects to MongoDB, never throwing. When the connection cannot be
 * established within CONNECT_TIMEOUT_MS (e.g. Atlas DNS flaking) it returns
 * null so callers fall back to the in-memory store instead of hanging or
 * erroring out. A successful background connection is cached for later calls.
 */
export async function connectToDatabase(): Promise<typeof mongoose | null> {
  const uriToUse = process.env.MONGODB_URI || MONGODB_URI;

  if (!uriToUse) {
    console.warn('MONGODB_URI is not defined. Falling back to in-memory store.');
    return null;
  }

  if (cached!.conn) {
    return cached!.conn;
  }

  if (!cached!.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
    };

    cached!.promise = mongoose.connect(uriToUse, opts).then(
      (mongooseInstance) => {
        console.log(`MongoDB connected successfully to cluster: ${mongooseInstance.connection.host}, database: ${mongooseInstance.connection.name}`);
        cached!.conn = mongooseInstance;
        return mongooseInstance;
      },
      (e) => {
        console.error('Failed to connect to MongoDB Atlas:', e);
        cached!.promise = null;
        return null;
      }
    );
  }

  return Promise.race([
    cached!.promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), CONNECT_TIMEOUT_MS)),
  ]);
}
