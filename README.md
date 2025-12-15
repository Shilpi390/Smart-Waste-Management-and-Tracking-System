# WasteWise Backend API

A comprehensive Node.js backend API for the WasteWise waste management system, built with Express.js and MySQL.

## 🚀 Features

- **User Management**: Admin, Driver, and Citizen roles with authentication
- **Bin Management**: Track waste bins with GPS coordinates and status
- **Task Management**: Assign and track collection tasks for drivers
- **Complaint System**: Citizens can report issues with photo/video evidence
- **Live Video Streaming**: Drivers can stream live video during collections
- **Real-time Notifications**: WebSocket-based notifications
- **File Uploads**: Handle images and videos with Multer
- **Reporting**: Generate reports and export data to Excel/CSV
- **Audit Logging**: Track all system activities
- **Map Integration**: GPS-based bin and driver tracking
- **System Monitoring**: Health checks and system statistics

## 📋 Prerequisites

- Node.js (v16 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=wastewise_db
   
   # JWT Configuration
   JWT_SECRET=your_super_secret_jwt_key
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

4. **Database Setup**
   ```bash
   # Create MySQL database
   mysql -u root -p
   CREATE DATABASE wastewise_db;
   exit
   
   # Run migrations
   npm run migrate
   
   # Seed initial data
   npm run seed
   ```

5. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| POST | `/api/auth/register` | Register new user | Public |
| POST | `/api/auth/login` | User login | Public |
| POST | `/api/auth/forgot-password` | Request password reset | Public |
| POST | `/api/auth/reset-password` | Reset password | Public |
| GET | `/api/auth/me` | Get current user | Private |

### User Management

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/api/users` | Get all users | Admin |
| GET | `/api/users/:id` | Get user by ID | Private |
| PUT | `/api/users/:id` | Update user | Private |
| DELETE | `/api/users/:id` | Delete user | Admin |
| GET | `/api/users/drivers` | Get all drivers | Private |
| GET | `/api/users/citizens` | Get all citizens | Private |
| PUT | `/api/users/:id/location` | Update user location | Private |

### Bin Management

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/api/bins` | Get all bins | Private |
| GET | `/api/bins/:id` | Get bin by ID | Private |
| POST | `/api/bins` | Create new bin | Admin |
| PUT | `/api/bins/:id` | Update bin | Admin |
| DELETE | `/api/bins/:id` | Delete bin | Admin |
| GET | `/api/bins/nearby` | Get nearby bins | Public |
| PUT | `/api/bins/:id/status` | Update bin status | Private |

### Task Management

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/api/tasks` | Get all tasks | Private |
| GET | `/api/tasks/:id` | Get task by ID | Private |
| POST | `/api/tasks` | Create new task | Admin |
| PUT | `/api/tasks/:id` | Update task | Private |
| DELETE | `/api/tasks/:id` | Delete task | Admin |
| GET | `/api/tasks/driver/:driverId` | Get driver tasks | Private |
| PUT | `/api/tasks/:id/assign` | Assign task to driver | Admin |
| PUT | `/api/tasks/:id/complete` | Mark task as complete | Private |

### Complaint Management

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/api/complaints` | Get all complaints | Private |
| GET | `/api/complaints/:id` | Get complaint by ID | Private |
| POST | `/api/complaints` | Create new complaint | Private |
| PUT | `/api/complaints/:id` | Update complaint | Private |
| DELETE | `/api/complaints/:id` | Delete complaint | Admin |
| POST | `/api/complaints/:id/images` | Upload complaint images | Private |
| PUT | `/api/complaints/:id/status` | Update complaint status | Private |

### Notification Management

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/api/notifications` | Get user notifications | Private |
| GET | `/api/notifications/:id` | Get notification by ID | Private |
| POST | `/api/notifications` | Create notification | Private |
| PUT | `/api/notifications/:id/read` | Mark as read | Private |
| DELETE | `/api/notifications/:id` | Delete notification | Private |

### Feedback Management

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/api/feedback` | Get all feedback | Private |
| GET | `/api/feedback/:id` | Get feedback by ID | Private |
| POST | `/api/feedback` | Create feedback | Public |
| PUT | `/api/feedback/:id` | Update feedback | Private |
| DELETE | `/api/feedback/:id` | Delete feedback | Admin |

### Dashboard & Reports

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/api/dashboard/admin` | Admin dashboard stats | Admin |
| GET | `/api/dashboard/driver` | Driver dashboard stats | Private |
| GET | `/api/dashboard/citizen` | Citizen dashboard stats | Private |
| GET | `/api/reports` | Get all reports | Private |
| POST | `/api/reports/generate` | Generate report | Private |
| GET | `/api/reports/:id/download` | Download report | Private |

### Map & Location Services

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/api/map/bins` | Get bins for map | Public |
| GET | `/api/map/bins/nearby` | Get nearby bins | Public |
| GET | `/api/map/drivers` | Get active drivers | Private |
| GET | `/api/map/complaints` | Get complaints with location | Private |
| POST | `/api/map/route` | Calculate route | Private |
| GET | `/api/map/stats` | Get map statistics | Private |

### Export & System

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/api/export/users` | Export users to Excel/CSV | Admin |
| GET | `/api/export/complaints` | Export complaints to Excel/CSV | Admin |
| GET | `/api/export/tasks` | Export tasks to Excel/CSV | Admin |
| GET | `/api/export/bins` | Export bins to Excel/CSV | Admin |
| GET | `/api/system/health` | System health check | Public |
| GET | `/api/system/stats` | System statistics | Admin |
| GET | `/api/system/logs` | System logs | Admin |
| POST | `/api/system/logs` | Create log entry | Private |
| GET | `/api/system/version` | System version info | Public |

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `NODE_ENV` | Environment | development |
| `DB_HOST` | Database host | localhost |
| `DB_PORT` | Database port | 3306 |
| `DB_USER` | Database user | root |
| `DB_PASSWORD` | Database password | - |
| `DB_NAME` | Database name | wastewise_db |
| `JWT_SECRET` | JWT secret key | - |
| `JWT_EXPIRES_IN` | JWT expiration | 7d |
| `UPLOAD_PATH` | File upload directory | uploads |
| `MAX_FILE_SIZE` | Max file size in bytes | 10485760 |
| `CORS_ORIGIN` | CORS origin | http://localhost:3000 |

### Database Schema

The system includes the following main tables:

- **users**: User accounts (admin, driver, citizen)
- **bins**: Waste collection bins with GPS coordinates
- **tasks**: Collection and maintenance tasks
- **complaints**: Citizen complaints with location data
- **notifications**: System notifications
- **feedback**: Website feedback and ratings
- **reports**: Generated reports
- **audit_logs**: System activity logs
- **system_settings**: System configuration
- **system_logs**: Application logs

## 🚀 Deployment

### Production Setup

1. **Environment Configuration**
   ```bash
   NODE_ENV=production
   PORT=5000
   DB_HOST=your_production_db_host
   DB_USER=your_production_db_user
   DB_PASSWORD=your_production_db_password
   JWT_SECRET=your_production_jwt_secret
   ```

2. **Database Migration**
   ```bash
   npm run migrate
   ```

3. **Start Production Server**
   ```bash
   npm start
   ```

### Docker Deployment

```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📝 Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server with nodemon |
| `npm test` | Run tests |
| `npm run migrate` | Run database migrations |
| `npm run seed` | Seed database with sample data |

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting
- CORS protection
- Helmet security headers
- Input validation with express-validator
- SQL injection protection
- File upload restrictions

## 📊 Monitoring

- Health check endpoint (`/api/health`)
- System statistics (`/api/system/stats`)
- Audit logging for all activities
- Error handling and logging
- Performance monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔄 Version History

- **v1.0.0** - Initial release with core features
- **v1.1.0** - Added live video streaming
- **v1.2.0** - Enhanced reporting and export features
- **v1.3.0** - Added system monitoring and audit logging

