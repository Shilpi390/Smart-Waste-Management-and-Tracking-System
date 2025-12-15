# WasteWise Backend Setup Guide

This guide will help you set up the WasteWise backend API from scratch.

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **MySQL** (v8.0 or higher) - [Download](https://dev.mysql.com/downloads/)
- **Git** - [Download](https://git-scm.com/)

### Step 1: Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd backend

# Install dependencies
npm install
```

### Step 2: Environment Configuration

```bash
# Copy environment template
cp env.example .env

# Edit the .env file with your settings
nano .env  # or use your preferred editor
```

**Required Environment Variables:**

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=wastewise_db

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# File Upload Configuration
UPLOAD_PATH=uploads
MAX_FILE_SIZE=10485760

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
CORS_CREDENTIALS=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Step 3: Database Setup

#### Option A: Using MySQL Command Line

```bash
# Connect to MySQL
mysql -u root -p

# Create database
CREATE DATABASE wastewise_db;
exit
```

#### Option B: Using MySQL Workbench

1. Open MySQL Workbench
2. Connect to your MySQL server
3. Create a new schema named `wastewise_db`

### Step 4: Run Database Migration

```bash
# Run database migrations to create tables
npm run migrate
```

### Step 5: Seed Initial Data

```bash
# Populate database with sample data
npm run seed
```

### Step 6: Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`

## 🔧 Detailed Configuration

### Database Configuration

The system uses MySQL with the following key tables:

- **users** - User accounts (admin, driver, citizen)
- **bins** - Waste collection bins
- **tasks** - Collection and maintenance tasks
- **complaints** - Citizen complaints
- **notifications** - System notifications
- **feedback** - Website feedback
- **reports** - Generated reports
- **audit_logs** - System activity logs

### File Upload Configuration

- **Upload Directory**: `uploads/` (created automatically)
- **Max File Size**: 10MB (configurable)
- **Allowed Types**: Images (jpg, png, gif) and Videos (mp4, avi, mov)

### Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: Prevents abuse with configurable limits
- **CORS Protection**: Cross-origin request security
- **Input Validation**: All inputs validated and sanitized

## 📊 API Testing

### Health Check

```bash
curl http://localhost:5000/api/health
```

### Authentication Test

```bash
# Register a new user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "role": "citizen"
  }'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

## 🐳 Docker Setup (Optional)

### Create Dockerfile

```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  backend:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DB_HOST=mysql
      - DB_USER=root
      - DB_PASSWORD=password
      - DB_NAME=wastewise_db
    depends_on:
      - mysql

  mysql:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=password
      - MYSQL_DATABASE=wastewise_db
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"

volumes:
  mysql_data:
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Database Connection Error

**Error**: `ECONNREFUSED` or `ER_ACCESS_DENIED_ERROR`

**Solutions**:
- Check MySQL service is running
- Verify database credentials in `.env`
- Ensure database `wastewise_db` exists
- Check firewall settings

#### 2. Port Already in Use

**Error**: `EADDRINUSE: address already in use :::5000`

**Solutions**:
- Change PORT in `.env` file
- Kill process using port 5000
- Use different port: `PORT=5001`

#### 3. Permission Denied for Uploads

**Error**: `EACCES: permission denied, mkdir 'uploads'`

**Solutions**:
- Create uploads directory manually
- Set proper permissions: `chmod 755 uploads`
- Run with appropriate user permissions

#### 4. JWT Secret Not Set

**Error**: `JWT_SECRET is required`

**Solutions**:
- Set JWT_SECRET in `.env` file
- Use a strong, random secret key
- Generate secret: `openssl rand -base64 32`

### Logs and Debugging

#### Enable Debug Logging

```env
NODE_ENV=development
```

#### View Logs

```bash
# View real-time logs
npm run dev

# View error logs
tail -f logs/error.log
```

#### Database Logs

```bash
# Check MySQL error log
sudo tail -f /var/log/mysql/error.log
```

## 📈 Performance Optimization

### Database Optimization

1. **Indexes**: Ensure proper indexes on frequently queried columns
2. **Connection Pool**: Adjust connection pool size based on load
3. **Query Optimization**: Use EXPLAIN to analyze slow queries

### Server Optimization

1. **Compression**: Enable gzip compression
2. **Caching**: Implement Redis for session storage
3. **Load Balancing**: Use PM2 for process management

### File Upload Optimization

1. **CDN**: Use CloudFront or similar for file delivery
2. **Compression**: Compress images before storage
3. **Cleanup**: Implement automatic cleanup of old files

## 🔒 Security Best Practices

### Production Security

1. **Environment Variables**: Never commit `.env` files
2. **HTTPS**: Use SSL certificates in production
3. **Firewall**: Configure proper firewall rules
4. **Updates**: Keep dependencies updated
5. **Monitoring**: Implement security monitoring

### Database Security

1. **User Permissions**: Use least privilege principle
2. **Backup**: Regular automated backups
3. **Encryption**: Encrypt sensitive data
4. **Access Control**: Restrict database access

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [MySQL Documentation](https://dev.mysql.com/doc/)
- [Socket.IO Documentation](https://socket.io/docs/)
- [JWT Documentation](https://jwt.io/introduction/)

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the logs for error messages
3. Verify your environment configuration
4. Ensure all prerequisites are installed
5. Create an issue in the repository

## 📝 Development Notes

### Code Structure

```
backend/
├── config/          # Database and app configuration
├── middleware/      # Custom middleware functions
├── routes/          # API route handlers
├── services/        # Business logic services
├── scripts/         # Database migration and seeding
├── uploads/         # File upload directory
└── server.js        # Main application entry point
```

### Adding New Features

1. Create route handler in `routes/`
2. Add middleware if needed in `middleware/`
3. Update database schema if required
4. Add tests for new functionality
5. Update documentation

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- --grep "auth"
```
