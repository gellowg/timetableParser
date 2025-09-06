const express = require('express');
const cors = require('cors');
const request = require('request');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const app = express();
const path = require('path');
const port = process.env.PORT || 3000;

// Trust proxy for Railway deployment
app.set('trust proxy', process.env.TRUST_PROXY === 'true' || 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));


// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 10, // limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/getTTData', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? process.env.ALLOWED_ORIGINS?.split(',') : true,
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static file serving - simple and working configuration
app.use(express.static(path.join(__dirname, 'public')));

// Main route
app.get('/', (req, res) => {
  res.render('index');
});


// Input validation middleware for GET request with headers
const validateTimetableRequest = (req, res, next) => {
  const { authorization, student_id, start_date, end_date } = req.headers;
  
  // Validate required headers
  if (!authorization || !student_id || !start_date || !end_date) {
    return res.status(400).json({
      error: 'Missing required headers',
      details: 'Authorization, student_id, start_date, and end_date headers are required'
    });
  }
  
  // Validate student_id format
  if (!/^[a-zA-Z0-9_-]+$/.test(student_id) || student_id.length < 1 || student_id.length > 50) {
    return res.status(400).json({
      error: 'Invalid student_id',
      details: 'Student ID must contain only alphanumeric characters, hyphens, and underscores (1-50 characters)'
    });
  }
  
  // Validate bearer token format
  if (!/^Bearer\s+.+/.test(authorization) || authorization.length < 20 || authorization.length > 500) {
    return res.status(400).json({
      error: 'Invalid authorization header',
      details: 'Authorization header must be in "Bearer <token>" format (20-500 characters)'
    });
  }
  
  // Validate date format
  const startDate = new Date(start_date);
  const endDate = new Date(end_date);
  
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return res.status(400).json({
      error: 'Invalid date format',
      details: 'Start date and end date must be valid ISO 8601 dates'
    });
  }
  
  // Validate date range
  if (startDate >= endDate) {
    return res.status(400).json({
      error: 'Invalid date range',
      details: 'Start date must be before end date'
    });
  }
  
  next();
};

app.get('/getTTData', validateTimetableRequest, (req, res) => {
  try {
    const { authorization, student_id, start_date, end_date } = req.headers;
  
    // Calculate academic year from start date
    const startDateObj = new Date(start_date);
    const currentYear = startDateObj.getFullYear();
    const currentMonth = startDateObj.getMonth() + 1; // getMonth() returns 0-11, so add 1
    const academicYear = currentMonth >= 9 ? currentYear + 1 : currentYear; // Academic year starts in September, use next year
    
    // Use the provided dates directly
    const blockStart = new Date(start_date);
    const blockEnd = new Date(end_date);
    
    // Format dates for the API
    const formatDateForAPI = (date) => {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      const dayName = days[date.getDay()];
      const day = date.getDate();
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      
      return `${dayName},%20${day}%20${month}%20${year}`;
    };
    
    const fromDate = formatDateForAPI(blockStart) + '%2000:00:00%20GMT';
    const toDate = formatDateForAPI(blockEnd) + '%2023:59:59%20GMT';
    
    // Debug logging
    console.log(`Request from IP: ${req.ip}`);
    console.log(`Student ID: ${student_id}`);
    console.log(`Academic Year: ${academicYear}`);
    console.log(`Date Range: ${start_date} to ${end_date}`);
    
    const schoolId = process.env.SCHOOL_ID || '209';
    const apiBaseUrl = process.env.API_BASE_URL || 'https://api.go4schools.com/web/stars/v1/timetable/student';
    
    const options = {
      method: 'GET',
      url: `${apiBaseUrl}/academic-years/${academicYear}/school-id/${schoolId}/user-type/1/student-id/${student_id}/from-date/${fromDate}/to-date/${toDate}?caching=true`,
      headers: {
        'Authorization': authorization,
        'User-Agent': 'TimetableParser/1.0.0',
        'Accept': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    };
    
    request(options, function (error, response) {
      if (error) {
        console.error('API Request Error:', error.message);
        return res.status(500).json({
          error: 'External API request failed',
          details: 'Unable to connect to the school timetable service. Please try again later.'
        });
      }
      
      console.log(`API Response Status: ${response.statusCode}`);
      
      if (response.statusCode === 401) {
        console.log('Authentication failed for student:', student_id);
        return res.status(401).json({
          error: 'Authentication failed',
          details: 'Invalid Bearer token. Please check your credentials.'
        });
      }
      
      if (response.statusCode === 404) {
        console.log('Student not found:', student_id);
        return res.status(404).json({
          error: 'Student not found',
          details: 'The provided Student ID was not found in the system.'
        });
      }
      
      if (response.statusCode !== 200) {
        console.log('API Error - Status:', response.statusCode, 'Body:', response.body);
        return res.status(502).json({
          error: 'External service error',
          details: `The school timetable service returned an error (${response.statusCode}). Please try again later.`
        });
      }
      
      try {
        const parsedData = JSON.parse(response.body);
        console.log(`Successfully retrieved ${parsedData.student_timetable?.length || 0} timetable events for student ${student_id}`);
        res.json(parsedData);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError.message);
        res.status(500).json({
          error: 'Invalid response format',
          details: 'The school timetable service returned invalid data. Please try again later.'
        });
      }
    });
    
  } catch (error) {
    console.error('Unexpected error:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      details: 'An unexpected error occurred. Please try again later.'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Debug endpoint to check file structure (only in development or for debugging)
app.get('/debug/files', (req, res) => {
  const fs = require('fs');
  const publicPath = path.join(__dirname, 'public');
  
  try {
    const files = fs.readdirSync(publicPath);
    const appJsPath = path.join(publicPath, 'app.js');
    const appJsStats = fs.existsSync(appJsPath) ? fs.statSync(appJsPath) : null;
    
    res.json({
      publicPath,
      files,
      appJsExists: fs.existsSync(appJsPath),
      appJsSize: appJsStats ? appJsStats.size : 0,
      appJsModified: appJsStats ? appJsStats.mtime : null,
      nodeEnv: process.env.NODE_ENV,
      workingDirectory: process.cwd(),
      __dirname: __dirname
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Production debug endpoint (simplified)
app.get('/debug/production', (req, res) => {
  const fs = require('fs');
  const publicPath = path.join(__dirname, 'public');
  
  res.json({
    status: 'ok',
    appJsExists: fs.existsSync(path.join(publicPath, 'app.js')),
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    details: 'The requested resource was not found on this server.'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    details: 'An unexpected error occurred. Please try again later.'
  });
});

app.listen(port, () => {
  console.log(`🚀 Timetable Parser server running on port ${port}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒 Rate limiting: ${process.env.RATE_LIMIT_MAX_REQUESTS || 10} requests per ${Math.floor((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 60000)} minutes`);
});