
let ENV = 'LOCAL'; 

if (ENV == 'LOCAL') {
    module.exports.DB_PORT = "27017";
    module.exports.MONGODB_URI = "mongodb+srv://srinivasan:yG1DtYmc6q41KSi7@qrsclusterlearning.wtihbgw.mongodb.net/vehicle-platform";
    module.exports.NODE_ENV = "development";
    module.exports.PORT = 5000;
    module.exports.JWT_SECRET = 'your-jwt-secret-key',
    module.exports.JWT_EXPIRE = '7d',
    module.exports.FRONTEND_URL = 'http://localhost:8080/'
    module.exports.ENABLE_MULTI_TENANCY = false;
    module.exports.MAIN_DB_POOL_SIZE = 20;
    module.exports.COMPANY_DB_POOL_SIZE = 10;
    module.exports.MAX_COMPANY_CONNECTIONS = 50;
    module.exports.DB_SERVER_SELECTION_TIMEOUT = 5000;
    module.exports.DB_SOCKET_TIMEOUT = 45000;
    // E-Sign SQS Configuration
    module.exports.ESIGN_PDF_QUEUE = process.env.ESIGN_PDF_QUEUE || 'esign-pdf-generation';
    module.exports.ESIGN_NOTIFICATION_QUEUE = process.env.ESIGN_NOTIFICATION_QUEUE || 'esign-notifications';
    module.exports.ESIGN_WEBHOOK_QUEUE = process.env.ESIGN_WEBHOOK_QUEUE || 'esign-webhooks';
    // PDF Service Configuration
    module.exports.PDF_SERVICE_TYPE = process.env.PDF_SERVICE_TYPE || 'puppeteer';
    module.exports.PDF_SERVICE_URL = process.env.PDF_SERVICE_URL || 'http://localhost:3001';
    module.exports.PDF_SERVICE_TIMEOUT = process.env.PDF_SERVICE_TIMEOUT || 30000;
    module.exports.PDF_SERVICE_MAX_RETRIES = process.env.PDF_SERVICE_MAX_RETRIES || 2;
    module.exports.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || null;
}
 else if (ENV == 'DEV') {
    module.exports.DB_PORT = "27017";
    module.exports.MONGODB_URI = "mongodb+srv://qrstestuser:BmRM7oG5i4F7@qrsdevmongo.wbo17ev.mongodb.net/vehicle-platform";
    module.exports.NODE_ENV = "development";
    module.exports.PORT = 5000;
    module.exports.JWT_SECRET = 'your-jwt-secret-key',
    module.exports.JWT_EXPIRE = '7d',
    module.exports.FRONTEND_URL = 'https://dev.autoerp.io/'
    module.exports.ENABLE_MULTI_TENANCY = false;
    module.exports.MAIN_DB_POOL_SIZE = 20;
    module.exports.COMPANY_DB_POOL_SIZE = 10;
    module.exports.MAX_COMPANY_CONNECTIONS = 50;
    module.exports.DB_SERVER_SELECTION_TIMEOUT = 5000;
    module.exports.DB_SOCKET_TIMEOUT = 45000;
    // E-Sign SQS Configuration
    module.exports.ESIGN_PDF_QUEUE = process.env.ESIGN_PDF_QUEUE || 'esign-pdf-generation-dev';
    module.exports.ESIGN_NOTIFICATION_QUEUE = process.env.ESIGN_NOTIFICATION_QUEUE || 'esign-notifications-dev';
    module.exports.ESIGN_WEBHOOK_QUEUE = process.env.ESIGN_WEBHOOK_QUEUE || 'esign-webhooks-dev';
} 
 else if (ENV == 'TEST') {
    module.exports.DB_PORT = "27017";
    module.exports.MONGODB_URI = "mongodb+srv://qrstestuser:BmRM7oG5i4F7@qrsdevmongo.wbo17ev.mongodb.net/vehicle-platform-test";
    module.exports.NODE_ENV = "testing";
    module.exports.PORT = 5001;
    module.exports.JWT_SECRET = 'your-jwt-secret-key',
    module.exports.JWT_EXPIRE = '7d',
    module.exports.FRONTEND_URL = 'https://test.autoerp.io/'
    module.exports.ENABLE_MULTI_TENANCY = false;
    module.exports.MAIN_DB_POOL_SIZE = 20;
    module.exports.COMPANY_DB_POOL_SIZE = 10;
    module.exports.MAX_COMPANY_CONNECTIONS = 50;
    module.exports.DB_SERVER_SELECTION_TIMEOUT = 5000;
    module.exports.DB_SOCKET_TIMEOUT = 45000;
    // E-Sign SQS Configuration
    module.exports.ESIGN_PDF_QUEUE = process.env.ESIGN_PDF_QUEUE || 'esign-pdf-generation-test';
    module.exports.ESIGN_NOTIFICATION_QUEUE = process.env.ESIGN_NOTIFICATION_QUEUE || 'esign-notifications-test';
    module.exports.ESIGN_WEBHOOK_QUEUE = process.env.ESIGN_WEBHOOK_QUEUE || 'esign-webhooks-test';
}   if (ENV == 'PROD') {
    module.exports.DB_PORT = "27017";
    module.exports.MONGODB_URI = "mongodb+srv://srinivasan:yG1DtYmc6q41KSi7@qrsclusterlearning.wtihbgw.mongodb.net/vehicle-platform";
    module.exports.NODE_ENV = "development";
    module.exports.PORT = 5000;
    module.exports.JWT_SECRET = 'your-jwt-secret-key',
    module.exports.JWT_EXPIRE = '7d',
    module.exports.FRONTEND_URL = 'http://localhost:8080/'
    module.exports.ENABLE_MULTI_TENANCY = false;
    module.exports.MAIN_DB_POOL_SIZE = 20;
    module.exports.COMPANY_DB_POOL_SIZE = 10;
    module.exports.MAX_COMPANY_CONNECTIONS = 50;
    module.exports.DB_SERVER_SELECTION_TIMEOUT = 5000;
    module.exports.DB_SOCKET_TIMEOUT = 45000;
    // E-Sign SQS Configuration
    module.exports.ESIGN_PDF_QUEUE = process.env.ESIGN_PDF_QUEUE || 'esign-pdf-generation-prod';
    module.exports.ESIGN_NOTIFICATION_QUEUE = process.env.ESIGN_NOTIFICATION_QUEUE || 'esign-notifications-prod';
    module.exports.ESIGN_WEBHOOK_QUEUE = process.env.ESIGN_WEBHOOK_QUEUE || 'esign-webhooks-prod';
}
