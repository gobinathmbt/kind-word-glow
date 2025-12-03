
let ENV = 'LOCAL'; 

if (ENV == 'LOCAL') {
    module.exports.DB_PORT = "27017";
    module.exports.MONGODB_URI = "mongodb+srv://srinivasan:yG1DtYmc6q41KSi7@qrsclusterlearning.wtihbgw.mongodb.net/vehicle-platform";
    module.exports.NODE_ENV = "development";
    module.exports.PORT = 5000;
    module.exports.JWT_SECRET = 'your-jwt-secret-key',
    module.exports.JWT_EXPIRE = '7d',
    module.exports.FRONTEND_URL = 'http://localhost:8080/'
    
    // ⚠️ PAYMENT GATEWAY KEYS REMOVED - Now managed from Payment Settings in Master Admin panel
    // Configure these keys in: Master Admin → Settings → Payment Settings
    // Keys are now stored in MasterAdmin schema under payment_settings field
}
 else if (ENV == 'DEV') {
    module.exports.DB_PORT = "27017";
    module.exports.MONGODB_URI = "mongodb+srv://qrstestuser:BmRM7oG5i4F7@qrsdevmongo.wbo17ev.mongodb.net/vehicle-platform";
    module.exports.NODE_ENV = "development";
    module.exports.PORT = 5000;
    module.exports.JWT_SECRET = 'your-jwt-secret-key',
    module.exports.JWT_EXPIRE = '7d',
    module.exports.FRONTEND_URL = 'https://dev.autoerp.io/'
    
    // ⚠️ PAYMENT GATEWAY KEYS REMOVED - Now managed from Payment Settings in Master Admin panel
    // Configure these keys in: Master Admin → Settings → Payment Settings
    // Keys are now stored in MasterAdmin schema under payment_settings field
} 
 else if (ENV == 'TEST') {
    module.exports.DB_PORT = "27017";
    module.exports.MONGODB_URI = "mongodb+srv://qrstestuser:BmRM7oG5i4F7@qrsdevmongo.wbo17ev.mongodb.net/vehicle-platform-test";
    module.exports.NODE_ENV = "testing";
    module.exports.PORT = 5001;
    module.exports.JWT_SECRET = 'your-jwt-secret-key',
    module.exports.JWT_EXPIRE = '7d',
    module.exports.FRONTEND_URL = 'https://test.autoerp.io/'
    
    // ⚠️ PAYMENT GATEWAY KEYS REMOVED - Now managed from Payment Settings in Master Admin panel
    // Configure these keys in: Master Admin → Settings → Payment Settings
    // Keys are now stored in MasterAdmin schema under payment_settings field
} else if (ENV == 'PROD') {
    module.exports.DB_PORT = "27017";
    module.exports.MONGODB_URI = "mongodb+srv://srinivasan:yG1DtYmc6q41KSi7@qrsclusterlearning.wtihbgw.mongodb.net/vehicle-platform";
    module.exports.NODE_ENV = "production";
    module.exports.PORT = 5000;
    module.exports.JWT_SECRET = 'your-jwt-secret-key',
    module.exports.JWT_EXPIRE = '7d',
    module.exports.FRONTEND_URL = 'https://autoerp.io/'
    
    // ⚠️ PAYMENT GATEWAY KEYS REMOVED - Now managed from Payment Settings in Master Admin panel
    // Configure these keys in: Master Admin → Settings → Payment Settings
    // Keys are now stored in MasterAdmin schema under payment_settings field
}
