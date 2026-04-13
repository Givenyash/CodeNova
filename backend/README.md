# CodeNOVA Backend - MERN Stack API

A robust and secure backend API built with the MERN stack (MongoDB, Express.js, React, Node.js) featuring code execution capabilities, user authentication, and snippet management.

## Features

- 🔐 **Authentication & Authorization**
  - JWT-based authentication with access and refresh tokens
  - Secure password hashing with bcrypt
  - Brute force protection
  - HTTP-only cookie storage
  
- 🐍 **Code Execution**
  - Secure Python code execution
  - Sandboxed environment with security checks
  - Execution timeout protection
  - Automatic history tracking
  
- 📝 **Snippet Management**
  - Create, read, update, and delete code snippets
  - Support for multiple programming languages
  - User-specific snippet storage
  
- 📊 **Execution History**
  - Track all code execution attempts
  - View stdout, stderr, and execution time
  - Clear history functionality

## Project Structure

```
backend/
├── config/
│   └── database.js          # MongoDB connection and index setup
├── controllers/
│   ├── authController.js    # Authentication logic
│   ├── codeController.js    # Code execution logic
│   ├── snippetController.js # Snippet CRUD operations
│   └── historyController.js # History management
├── middleware/
│   ├── auth.js             # JWT authentication middleware
│   ├── bruteForce.js       # Brute force protection
│   └── tokenHelper.js      # Token generation helpers
├── models/
│   ├── User.js             # User schema
│   ├── Snippet.js          # Snippet schema
│   ├── History.js          # Execution history schema
│   └── LoginAttempt.js     # Login attempt tracking
├── routes/
│   ├── authRoutes.js       # Auth endpoints
│   ├── codeRoutes.js       # Code execution endpoints
│   ├── snippetRoutes.js    # Snippet endpoints
│   └── historyRoutes.js    # History endpoints
├── .env.example            # Environment variables template
├── .gitignore              # Git ignore rules
├── package.json            # Dependencies and scripts
└── server.js               # Main application entry point
```

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (v5 or higher)
- Python 3 (for code execution)

## Installation

1. **Clone the repository**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and configure your environment variables:
   - `MONGO_URL`: MongoDB connection string
   - `DB_NAME`: Database name
   - `JWT_SECRET`: Secret key for JWT tokens
   - `PORT`: Server port (default: 8001)
   - `FRONTEND_URL`: Frontend URL for CORS

4. **Start MongoDB**
   Make sure MongoDB is running on your system.

5. **Run the application**
   
   Development mode (with auto-reload):
   ```bash
   npm run dev
   ```
   
   Production mode:
   ```bash
   npm start
   ```

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login user | No |
| POST | `/api/auth/logout` | Logout user | Yes |
| GET | `/api/auth/me` | Get current user | Yes |
| POST | `/api/auth/refresh` | Refresh access token | No |

### Code Execution

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/run-code` | Execute Python code | Yes |

### Snippets

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/snippets` | Create snippet | Yes |
| GET | `/api/snippets` | Get all snippets | Yes |
| GET | `/api/snippets/:id` | Get single snippet | Yes |
| PUT | `/api/snippets/:id` | Update snippet | Yes |
| DELETE | `/api/snippets/:id` | Delete snippet | Yes |

### History

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/history` | Get execution history | Yes |
| DELETE | `/api/history` | Clear all history | Yes |
| DELETE | `/api/history/:id` | Delete single entry | Yes |

## API Response Format

All responses follow a consistent format:

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "count": 10  // for list endpoints
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description"
}
```

## Security Features

- ✅ Password hashing with bcrypt (10 salt rounds)
- ✅ JWT tokens with expiration (15min access, 7 days refresh)
- ✅ HTTP-only cookies to prevent XSS attacks
- ✅ Brute force protection (5 attempts, 15-minute lockout)
- ✅ Code sanitization to prevent dangerous operations
- ✅ Execution timeout (5 seconds)
- ✅ CORS protection
- ✅ Input validation

## Default Admin Account

On first startup, an admin account is created automatically:
- **Email:** admin@example.com
- **Password:** admin123

⚠️ **Important:** Change these credentials in production!

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `8001` |
| `NODE_ENV` | Environment | `development` |
| `MONGO_URL` | MongoDB URL | `mongodb://localhost:27017` |
| `DB_NAME` | Database name | `codenova` |
| `JWT_SECRET` | JWT secret key | *(required)* |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |
| `ADMIN_EMAIL` | Admin email | `admin@example.com` |
| `ADMIN_PASSWORD` | Admin password | `admin123` |
| `CODE_EXECUTION_TIMEOUT` | Code timeout (ms) | `5000` |

## Development

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with auto-reload
- `npm run dev:legacy` - Start with nodemon (alternative)
- `npm run setup` - Install dependencies and create .env file

## Error Handling

The API uses standard HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

## License

MIT License - feel free to use this project for learning and development.

## Support

For issues or questions, please open an issue in the repository.
