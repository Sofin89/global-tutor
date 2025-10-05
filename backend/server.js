// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import middleware
const ErrorHandler = require('./middleware/errorHandler');
const LoggingMiddleware = require('./middleware/logger');
const SecurityMiddleware = require('./middleware/security');
const PerformanceMiddleware = require('./middleware/performance');

// Import routes
const authRoutes = require('./routes/auth');
const questionRoutes = require('./routes/questions');
const testRoutes = require('./routes/tests');
const tutorRoutes = require('./routes/tutor');
const flashcardRoutes = require('./routes/flashcards');

const app = express();

// Security Middleware
app.use(SecurityMiddleware.helmetConfig());
app.use(SecurityMiddleware.corsConfig());
app.use(SecurityMiddleware.securityHeaders());
app.use(SecurityMiddleware.requestSizeLimit());
app.use(SecurityMiddleware.noSqlSanitization());
app.use(SecurityMiddleware.xssSanitization());
app.use(SecurityMiddleware.parameterPollution());

// Performance Middleware
app.use(PerformanceMiddleware.compression());
app.use(PerformanceMiddleware.keepAlive());

// Logging Middleware
app.use(LoggingMiddleware.requestId);
app.use(LoggingMiddleware.correlationId);
app.use(LoggingMiddleware.httpLogger);
app.use(LoggingMiddleware.performanceMonitor);

// Body Parsing Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-global-tutor';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB connected successfully');
  console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

// Database event listeners
mongoose.connection.on('connected', () => {
  console.log('📚 MongoDB connected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

// Database performance monitoring
PerformanceMiddleware.dbPoolMonitor(mongoose);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/tutor', tutorRoutes);
app.use('/api/flashcards', flashcardRoutes);

// Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'AI Global Tutor API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// API Info Route
app.get('/api', (req, res) => {
  res.json({
    name: 'AI Global Tutor API',
    version: '1.0.0',
    description: 'AI-powered tutoring platform for competitive exams',
    endpoints: {
      auth: '/api/auth',
      questions: '/api/questions',
      tests: '/api/tests',
      tutor: '/api/tutor',
      flashcards: '/api/flashcards'
    },
    documentation: '/api/docs', // You can add Swagger docs later
    status: 'operational'
  });
});

// 404 Handler - Must be before error handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      timestamp: new Date().toISOString()
    }
  });
});

// Error Handling Middleware (Must be last)
app.use(ErrorHandler.handleError);

// Global Error Handlers
ErrorHandler.handleUnhandledRejection();
ErrorHandler.handleUncaughtException();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔴 Received SIGINT. Shutting down gracefully...');
  
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n🔴 Received SIGTERM. Shutting down gracefully...');
  
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log('\n🚀 AI Global Tutor Server Started Successfully!');
  console.log('='.repeat(50));
  console.log(`📚 Server running on port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️ Database: ${MONGODB_URI}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log('='.repeat(50));
  console.log('📋 Available Routes:');
  console.log(`   🔐 Auth: http://localhost:${PORT}/api/auth`);
  console.log(`   ❓ Questions: http://localhost:${PORT}/api/questions`);
  console.log(`   📝 Tests: http://localhost:${PORT}/api/tests`);
  console.log(`   👨‍🏫 Tutor: http://localhost:${PORT}/api/tutor`);
  console.log(`   📇 Flashcards: http://localhost:${PORT}/api/flashcards`);
  console.log(`   ❤️ Health: http://localhost:${PORT}/health`);
  console.log('='.repeat(50));
});

// Server error handling
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', error);
    process.exit(1);
  }
});

module.exports = app;