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



// Start server
server.listen(PORT, '0.0.0.0', () => {
  // migrate();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  const { stopQueueConsumer } = require('./controllers/sqs.controller');
  const { stopWorkshopQueueConsumer } = require('./controllers/workshopReportSqs.controller');
  
  // Stop both queue consumers
  stopQueueConsumer();
  stopWorkshopQueueConsumer();
  
  server.close(() => {
  });
});

process.on('SIGINT', () => {
  const { stopQueueConsumer } = require('./controllers/sqs.controller');
  const { stopWorkshopQueueConsumer } = require('./controllers/workshopReportSqs.controller');
  
  // Stop both queue consumers
  stopQueueConsumer();
  stopWorkshopQueueConsumer();
  
  server.close(() => {
  });
});

async function migrate() {
  const source = new MongoClient(
    "mongodb+srv://srinivasan:yG1DtYmc6q41KSi7@qrsclusterlearning.wtihbgw.mongodb.net"
  );
  const target = new MongoClient(
    "mongodb+srv://qrstestuser:BmRM7oG5i4F7@qrsdevmongo.wbo17ev.mongodb.net"
  );

  try {
    await source.connect();
    await target.connect();

    // const srcDB = source.db("vehicle-platform");
    // const tgtDB = target.db("vehicle-platform");
    // const tgtDB = target.db("vehicle-platform-test");

    // Get all collections in source
    const collections = await srcDB.listCollections().toArray();

    for (const coll of collections) {
      const srcCollection = srcDB.collection(coll.name);
      const tgtCollection = tgtDB.collection(coll.name);

      // Truncate target collection
      await tgtCollection.deleteMany({});

      // Fetch docs from source
      const docs = await srcCollection.find().toArray();

      if (docs.length > 0) {
        await tgtCollection.insertMany(docs);
      }
    }
  } catch (err) {
    console.error("Error during migration:", err);
  } finally {
    await source.close();
    await target.close();
  }
}