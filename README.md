# Timetable Downloader

A secure web application for downloading student timetables as calendar files (.ics format).

## Features

- 🔒 **Secure**: Rate limiting, input validation, and security headers
- 📅 **Automatic Date Range**: Detects academic year and sets appropriate date range
- 💾 **Credential Memory**: Remembers your login details for convenience
- 🎨 **Modern UI**: Clean interface with loading states and helpful tooltips
- 🚀 **Production Ready**: Optimized for deployment on Railway

## Security Features

- Rate limiting (10 requests per 15 minutes per IP)
- Input validation and sanitization
- Security headers (HSTS, CSP, X-Frame-Options)
- HTTPS enforcement in production
- Request size limits
- Timeout protection

## Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   ```
   http://localhost:3000
   ```

## Production Deployment (Railway)

1. **Connect to Railway:**
   - Push your code to GitHub
   - Connect your repository to Railway
   - Railway will automatically detect the Node.js app

2. **Set environment variables in Railway dashboard:**
   ```
   NODE_ENV=production
   PORT=3000
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=10
   API_BASE_URL=https://api.go4schools.com
   SCHOOL_ID=209
   CORS_ORIGIN=*
   LOG_LEVEL=info
   ```

3. **Deploy:**
   - Railway will automatically build and deploy
   - Your app will be available at the provided Railway URL

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | `development` |
| `PORT` | Server port | `3000` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in milliseconds | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `10` |
| `API_BASE_URL` | External API base URL | `https://api.go4schools.com` |
| `SCHOOL_ID` | School identifier | `209` |
| `CORS_ORIGIN` | Allowed CORS origins | `*` |
| `LOG_LEVEL` | Logging level | `info` |

## API Endpoints

### POST `/getTTData`

Downloads timetable data for a student.

**Request Body:**
```json
{
  "student_id": "string",
  "bearer_token": "string", 
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD"
}
```

**Response:**
```json
{
  "student_timetable": [...],
  "settings": {...}
}
```

## Security Considerations

- All inputs are validated and sanitized
- Rate limiting prevents abuse
- Security headers protect against common attacks
- HTTPS is enforced in production
- Sensitive data is not logged

## License

MIT License - see LICENSE file for details.
