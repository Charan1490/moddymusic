import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI;
// Use a default name if MONGODB_DB_NAME is not set, or allow it to be fully part of the URI.
// If MONGODB_DB_NAME is in the URI, MongoClient will use that. If not, it uses the one specified here.
// For more robust behavior, it's often better to include the DB name in the MONGODB_URI itself.
const defaultDbName = 'moodify_music_app';
const dbName = process.env.MONGODB_DB_NAME || defaultDbName;

if (!uri) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env. It should start with "mongodb://" or "mongodb+srv://"'
  );
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// Ensure that the URI is valid before attempting to create a client
try {
  // Test if URI is valid by trying to create a URL object,
  // MongoClient constructor might not throw immediately for all malformed URI types
  // but this adds an early check for basic validity.
  new URL(uri); 
} catch (e) {
    throw new Error(
    `Invalid MONGODB_URI: ${uri}. It must be a valid MongoDB connection string (e.g., "mongodb://localhost:27017" or "mongodb+srv://user:pass@cluster.mongodb.net").`
  );
}


if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  // @ts-ignore
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
     // @ts-ignore
    global._mongoClientPromise = client.connect();
  }
   // @ts-ignore
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export async function getDb(): Promise<Db> {
  const mongoClient = await clientPromise;
  // If dbName is part of the URI, mongoClient.db() without args might be desired.
  // However, explicitly passing dbName ensures we connect to the intended DB.
  return mongoClient.db(dbName);
}

export default clientPromise;
