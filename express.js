const express = require('express');
const cors = require('cors');
const request = require('request');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const compression = require('compression');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const app = express();
const path = require('path');
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Security middleware
if (isProduction) {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));
} else {
  // In development, completely disable helmet to avoid any issues
  console.log('Development mode: Security headers disabled');
}

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

app.use(limiter);

// Compression middleware
app.use(compression());

// Logging
app.use(morgan(isProduction ? 'combined' : 'dev'));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN === '*' ? true : process.env.CORS_ORIGIN?.split(','),
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files middleware with proper headers
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    // Ensure static files are served with proper content type
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
    // Remove nosniff header for static files to allow proper MIME type detection
    res.removeHeader('X-Content-Type-Options');
  }
}));

// Debug static file serving
app.use((req, res, next) => {
  if (req.url.startsWith('/app.js')) {
    console.log('Request for app.js:', req.url);
    console.log('Public directory exists:', require('fs').existsSync(path.join(__dirname, 'public')));
    console.log('App.js exists:', require('fs').existsSync(path.join(__dirname, 'public', 'app.js')));
  }
  next();
});

// Middleware to handle protocol consistency
app.use((req, res, next) => {
  // Ensure we're not forcing HTTPS in development
  if (!isProduction && req.header('x-forwarded-proto') === 'https') {
    return res.redirect(`http://${req.header('host')}${req.url}`);
  }
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/', (req, res) => {
  res.render('index');
});

// Explicit route for app.js to ensure it's served correctly
app.get('/app.js', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'app.js');
  console.log('Serving app.js from:', filePath);
  console.log('File exists:', require('fs').existsSync(filePath));
  
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error serving app.js:', err);
      res.status(404).send('File not found');
    }
  });
});

// Input validation middleware
const validateTimetableRequest = [
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

// Validation rules
const timetableValidation = [
  body('student_id')
    .notEmpty()
    .withMessage('Student ID is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Student ID must be between 1 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Student ID contains invalid characters'),
  
  body('bearer_token')
    .notEmpty()
    .withMessage('Bearer token is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Bearer token must be between 10 and 500 characters'),
  
  body('start_date')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  
  body('end_date')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('End date must be a valid date')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.start_date)) {
        throw new Error('End date must be after start date');
      }
      return true;
    })
];

app.post('/getTTData', timetableValidation, validateTimetableRequest, (req, res) => {
  try {
    const { student_id, bearer_token, start_date, end_date } = req.body;
    
    // Additional validation
    if (!student_id || !bearer_token || !start_date || !end_date) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Please provide student_id, bearer_token, start_date, and end_date'
      });
    }
  
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
    console.log(`Selected Start Date: ${start_date}`);
    console.log(`Selected End Date: ${end_date}`);
    console.log(`Academic Year: ${academicYear}`);
    console.log(`Block Start: ${blockStart.toDateString()}`);
    console.log(`Block End: ${blockEnd.toDateString()}`);
    console.log(`From Date: ${fromDate}`);
    console.log(`To Date: ${toDate}`);
    
    const options = {
      'method': 'GET',
      'url': `${process.env.API_BASE_URL || 'https://api.go4schools.com'}/web/stars/v1/timetable/student/academic-years/${academicYear}/school-id/${process.env.SCHOOL_ID || 209}/user-type/1/student-id/${student_id}/from-date/${fromDate}/to-date/${toDate}?caching=true`,
      'headers': {
        'Authorization': `Bearer ${bearer_token}`,
        'User-Agent': 'TimetableApp/1.0'
      },
      'timeout': 30000 // 30 second timeout
    };
    
    request(options, function (error, response) {
      if (error) {
        console.error('Request error:', error);
        return res.status(500).json({
          error: 'API request failed',
          message: 'Unable to connect to the timetable service. Please try again later.'
        });
      }
      
      console.log('API Response Status:', response.statusCode);
      
      if (response.statusCode !== 200) {
        console.error('API Error - Status:', response.statusCode);
        let errorMessage = 'API returned an error';
        
        if (response.statusCode === 401) {
          errorMessage = 'Invalid credentials. Please check your Student ID and Bearer Token.';
        } else if (response.statusCode === 404) {
          errorMessage = 'Student not found. Please verify your Student ID.';
        } else if (response.statusCode === 429) {
          errorMessage = 'Too many requests. Please wait before trying again.';
        } else if (response.statusCode >= 500) {
          errorMessage = 'Server error. Please try again later.';
        }
        
        return res.status(response.statusCode).json({
          error: 'API Error',
          message: errorMessage,
          statusCode: response.statusCode
        });
      }
      
      try {
        const parsedData = JSON.parse(response.body);
        console.log('Parsed API data:', parsedData);
        console.log('Student timetable data:', parsedData.student_timetable);
        console.log('Number of timetable events:', parsedData.student_timetable ? parsedData.student_timetable.length : 'undefined');
        res.json(parsedData);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        res.status(500).json({
          error: 'Invalid response format',
          message: 'The timetable service returned invalid data. Please try again later.'
        });
      }
    });
    
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again later.'
    });
  }
});

// Catch-all handler for missing routes
app.use('*', (req, res) => {
  console.log('404 - Route not found:', req.originalUrl);
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Public directory: ${path.join(__dirname, 'public')}`);
  console.log(`App.js exists: ${require('fs').existsSync(path.join(__dirname, 'public', 'app.js'))}`);
});