import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function checkMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('MONGODB_URI not found in .env');
    return;
  }
  try {
    await mongoose.connect(uri);
    const admin = mongoose.connection.db.admin();
    const info = await admin.serverStatus();
    console.log('MongoDB Version:', info.version);
    if (info.repl) {
      console.log('Replica set info:', info.repl);
    } else {
      console.log('Not a replica set (Standalone)');
    }
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
  } finally {
    await mongoose.disconnect();
  }
}

checkMongo();
