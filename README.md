# Timetable Parser

A secure, production-ready application that converts school timetables to calendar files (.ics format).

## Features

- 🔒 **Secure**: Rate limiting, input validation, security headers
- 🚀 **Fast**: Compression, optimized requests
- 📱 **User-friendly**: Modern UI with tooltips and progress indicators
- 🛡️ **Production-ready**: Error handling, logging, health checks

## Security Features

- Rate limiting (5 requests per 15 minutes in production)
- Input validation and sanitization
- Security headers (Helmet.js)
- CORS protection
- Request size limits
- Comprehensive error handling

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create environment file:
   ```bash
   cp .env.example .env
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

## Railway Deployment

1. Connect your GitHub repository to Railway
2. Railway will automatically detect the Node.js app
3. Set environment variables in Railway dashboard:
   - `NODE_ENV=production`
   - `RATE_LIMIT_MAX_REQUESTS=5`
   - `TRUST_PROXY=true`
   - `ALLOWED_ORIGINS=https://your-app.railway.app`

4. Deploy! Railway will handle SSL automatically.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 10 |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (ms) | 900000 |
| `SCHOOL_ID` | School ID for API | 209 |
| `API_BASE_URL` | External API base URL | go4schools.com |
| `TRUST_PROXY` | Trust proxy headers | true |
| `ALLOWED_ORIGINS` | CORS allowed origins | * (dev) |

## API Endpoints

- `GET /` - Main application
- `GET /getTTData` - Fetch timetable data
- `GET /health` - Health check

## Security Considerations

- All inputs are validated and sanitized
- Rate limiting prevents abuse
- Security headers protect against common attacks
- Error messages don't leak sensitive information
- Request timeouts prevent hanging connections

## Monitoring

- Health check endpoint: `/health`
- Structured logging with Morgan
- Error tracking and monitoring ready
- Uptime and performance metrics available

## License

MIT
