
# Auto Erp Backend API

Enterprise-grade backend for vehicle trade-in and inspection management platform.

## Features

- **Multi-tenant Architecture**: Secure isolation between companies
- **Role-based Access Control**: Master admin, company super admin, and company admin roles
- **RESTful API**: Comprehensive endpoints for all operations
- **Queue Processing**: SQS integration for vehicle data processing
- **Email Notifications**: Automated email workflows
- **Audit Logging**: Comprehensive event logging system
- **Security**: JWT authentication, rate limiting, data sanitization

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Email**: Nodemailer with Gmail SMTP
- **Queue**: Bull.js with Redis
- **Cloud Storage**: AWS S3
- **Security**: Helmet, CORS, XSS protection

## Environment Variables

Create a `.env` file in the backend directory:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/vehicle-platform

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d

# Email Configuration (Gmail SMTP)
GMAIL_USER=your-email@gmail.com
GMAIL_PASSWORD=your-app-password

# AWS Configuration (Optional)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
S3_BUCKET=your-bucket-name

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Application
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:8080
```

## Installation & Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register-company` - Company registration
- `GET /api/auth/me` - Get current user info

### Master Admin Routes
- `GET /api/master/dashboard` - Dashboard analytics
- `GET /api/master/companies` - List all companies
- `POST /api/master/plans` - Create subscription plan
- `PUT /api/master/settings` - Update SMTP settings

### Company Management
- `GET /api/company/dashboard` - Company dashboard
- `POST /api/company/users` - Create company user
- `GET /api/company/users` - List company users
- `PUT /api/company/settings` - Update company settings

### Vehicle Operations
- `POST /api/vehicle/stock` - Add vehicle(s) to queue
- `GET /api/vehicle/stock` - List vehicles with pagination
- `GET /api/vehicle/:id` - Get vehicle details

### Configuration Management
- `POST /api/config/dropdown` - Create dropdown configuration
- `POST /api/config/inspection` - Create inspection configuration
- `POST /api/config/tradein` - Create trade-in configuration

### Queue Operations
- Vehicle data processing through SQS queues
- Automatic retry mechanisms for failed operations
- Bulk vehicle import processing

## Database Schema

### Key Collections
- `masteradmins` - Platform administrators
- `companies` - Registered companies
- `users` - Company users (super admin, admin)
- `plans` - Subscription plans
- `vehicles` - Vehicle inventory
- `dropdownmasters` - Dynamic dropdown configurations
- `inspectionconfigs` - Inspection form configurations
- `tradeinconfigs` - Trade-in form configurations
- `globallogs` - Comprehensive audit logs

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting per IP
- Request sanitization
- XSS protection
- CORS configuration
- Account lockout after failed attempts
- Audit logging for all operations

## Queue System

The platform uses Bull.js queues for:
- Vehicle data processing
- Bulk import operations
- Email notifications
- Webhook callbacks
- Report generation

## Error Handling

Centralized error handling with:
- Custom error classes
- Structured error responses
- Global error middleware
- Comprehensive logging

## Monitoring & Logging

- Request/response logging
- Performance monitoring
- Error tracking
- User activity auditing
- System health checks

## Development

```bash
# Run tests
npm test

# Lint code
npm run lint

# Generate API documentation
npm run docs
```

## Deployment

The backend is designed for easy deployment on:
- AWS EC2/ECS
- Google Cloud Platform
- Docker containers
- Traditional VPS

## Support

For technical support and questions, please contact the development team.
