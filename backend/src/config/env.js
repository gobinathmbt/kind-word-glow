
let ENV = 'LOCAL'; 

if (ENV == 'LOCAL') {
    module.exports.DB_PORT = "27017";
    module.exports.MONGODB_URI = "mongodb+srv://srinivasan:yG1DtYmc6q41KSi7@qrsclusterlearning.wtihbgw.mongodb.net/vehicle-platform";
    module.exports.NODE_ENV = "development";
    module.exports.PORT = 5000;
    module.exports.JWT_SECRET = 'your-jwt-secret-key',
    module.exports.JWT_EXPIRE = '7d',
    module.exports.FRONTEND_URL = 'http://localhost:8080/'
} else if (ENV == 'TEST') {
    module.exports.DB_PORT = "27017";
    module.exports.MONGODB_URI = "mongodb+srv://qrstestuser:BmRM7oG5i4F7@qrsdevmongo.wbo17ev.mongodb.net/vehicle-platform";
    module.exports.NODE_ENV = "development";
    module.exports.PORT = 5000;
    module.exports.JWT_SECRET = 'your-jwt-secret-key',
    module.exports.JWT_EXPIRE = '7d',
    module.exports.FRONTEND_URL = 'https://dev.autoerp.io/'
}   if (ENV == 'PROD') {
    module.exports.DB_PORT = "27017";
    module.exports.MONGODB_URI = "mongodb+srv://srinivasan:yG1DtYmc6q41KSi7@qrsclusterlearning.wtihbgw.mongodb.net/vehicle-platform";
    module.exports.NODE_ENV = "development";
    module.exports.PORT = 5000;
    module.exports.JWT_SECRET = 'your-jwt-secret-key',
    module.exports.JWT_EXPIRE = '7d',
    module.exports.FRONTEND_URL = 'http://localhost:8080/'
}
