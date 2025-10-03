const http = require('http');
const { MongoClient } = require("mongodb");
const app = require('./app');
const connectDB = require('./config/db');
const { initializeSocket } = require('./controllers/socket.controller');
const Env_Configuration =require('./config/env');


const PORT = Env_Configuration.PORT;

// Connect to MongoDB
connectDB();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io with the server
const { mainIO, chatIO, metaIO, notificationIO } = initializeSocket(server);

// Start SQS queue consumers
console.log('🔄 Starting SQS Queue Consumers...');



// Start server
server.listen(PORT, '0.0.0.0', () => {
  // migrate();
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${Env_Configuration.NODE_ENV}`);
  console.log(`🔗 Database: ${Env_Configuration.MONGODB_URI ? 'Connected' : 'Not configured'}`);
  console.log(`🌐 Frontend URL: ${Env_Configuration.FRONTEND_URL || 'http://localhost:8080'}`);
  console.log(`🔌 Multi-namespace Socket.io server initialized at http://localhost:${PORT}`);
  console.log(`📞 Chat namespace available at http://localhost:${PORT}/chat`);
  console.log(`📊 Metadata namespace available at http://localhost:${PORT}/metadata`);
  console.log(`🔔 Notification namespace available at http://localhost:${PORT}/notifications`);
  console.log(`🚛 Vehicle Queue Consumer: Running (every 10 seconds)`);
  console.log(`🏗️ Workshop Queue Consumer: Running (every 15 seconds)`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`❌ Unhandled Rejection: ${err.message}`);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  const { stopQueueConsumer } = require('./controllers/sqs.controller');
  const { stopWorkshopQueueConsumer } = require('./controllers/workshopReportSqs.controller');
  
  // Stop both queue consumers
  stopQueueConsumer();
  stopWorkshopQueueConsumer();
  
  server.close(() => {
    console.log('💤 Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  const { stopQueueConsumer } = require('./controllers/sqs.controller');
  const { stopWorkshopQueueConsumer } = require('./controllers/workshopReportSqs.controller');
  
  // Stop both queue consumers
  stopQueueConsumer();
  stopWorkshopQueueConsumer();
  
  server.close(() => {
    console.log('💤 Process terminated');
  });
});

async function migrate() {
  console.log("Starting migration...");

  const source = new MongoClient(
    "mongodb+srv://srinivasan:yG1DtYmc6q41KSi7@qrsclusterlearning.wtihbgw.mongodb.net/vehicle-platform"
  );
  const target = new MongoClient(
    "mongodb+srv://qrstestuser:BmRM7oG5i4F7@qrsdevmongo.wbo17ev.mongodb.net/vehicle-platform"
  );

  try {
    await source.connect();
    await target.connect();
    console.log("Connected to both databases");

    const srcDB = source.db("vehicle-platform");
    const tgtDB = target.db("vehicle-platform");

    // Get all collections in source
    const collections = await srcDB.listCollections().toArray();

    for (const coll of collections) {
      console.log(`Processing collection: ${coll.name}`);

      const srcCollection = srcDB.collection(coll.name);
      const tgtCollection = tgtDB.collection(coll.name);

      // Truncate target collection
      await tgtCollection.deleteMany({});
      console.log(`Cleared target collection: ${coll.name}`);

      // Fetch docs from source
      const docs = await srcCollection.find().toArray();

      if (docs.length > 0) {
        await tgtCollection.insertMany(docs);
        console.log(`Inserted ${docs.length} documents into ${coll.name}`);
      } else {
        console.log(`No documents to insert for ${coll.name}`);
      }
    }

    console.log("Migration complete!");
  } catch (err) {
    console.error("Error during migration:", err);
  } finally {
    await source.close();
    await target.close();
    console.log("Connections closed.");
  }
}