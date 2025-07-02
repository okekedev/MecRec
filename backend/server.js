/**
 * MedRec Server - Load .env from backend directory
 */
require('dotenv').config({ path: __dirname + '/.env' }); // Load from backend/.env
const express = require('express');
const path = require('path');
const cors = require('cors');
const openaiRouter = require('./api/openai.js');

const app = express();
const PORT = process.env.PORT || 3000;
const isDevelopment = process.env.NODE_ENV !== 'production';

// Debug: Check if environment variables are loaded
console.log('🔍 Backend Environment Check:');
console.log('📁 Loading .env from:', __dirname + '/.env');
console.log('AZURE_OPENAI_ENDPOINT:', process.env.AZURE_OPENAI_ENDPOINT ? '✅ Set' : '❌ Missing');
console.log('AZURE_OPENAI_API_KEY:', process.env.AZURE_OPENAI_API_KEY ? `✅ Set (${process.env.AZURE_OPENAI_API_KEY.length} chars)` : '❌ Missing');
console.log('AZURE_OPENAI_DEPLOYMENT:', process.env.AZURE_OPENAI_DEPLOYMENT ? '✅ Set' : '❌ Missing');

// Rest of your server code stays the same...
// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS for development
if (isDevelopment) {
  app.use(cors({
    origin: [
      'http://localhost:19006', // Expo dev server
      'http://localhost:3000',  // This server
      'http://127.0.0.1:19006',
      'http://127.0.0.1:3000'
    ],
    credentials: true
  }));
  console.log('🛠️ Development mode: CORS enabled for Expo dev server');
}

// Logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// API routes
app.use('/api/openai', openaiRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    mode: isDevelopment ? 'development' : 'production',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: {
      hasApiKey: !!process.env.AZURE_OPENAI_API_KEY,
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      deployment: process.env.AZURE_OPENAI_DEPLOYMENT
    }
  });
});
// Static files and SPA routing (production only)
if (!isDevelopment) {
  app.use(express.static(path.join(__dirname, '../web-build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../web-build', 'index.html'));
  });
  console.log('🏭 Production mode: Serving static React app');
} else {
  app.get('/', (req, res) => {
    res.json({ 
      message: 'MedRec API Server (Development Mode)',
      note: 'Use `npm run web` for the React app with hot reload',
      apiEndpoint: '/api/openai/extract',
      health: '/health'
    });
  });
  console.log('🛠️ Development mode: API-only server');
  console.log('🔥 For hot reload, run: npm run web (in another terminal)');
}

// Error handling
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`🏥 MedRec ${isDevelopment ? 'API' : ''} server running on port ${PORT}`);
  console.log(`🌐 ${isDevelopment ? 'API available' : 'App available'} at: http://localhost:${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
  console.log(`🤖 API endpoint: http://localhost:${PORT}/api/openai/extract`);
  
  if (isDevelopment) {
    console.log('');
    console.log('📋 Development Commands:');
    console.log('  npm run web    - Start Expo dev server (hot reload)');
    console.log('  npm run api    - Start API server only');
    console.log('  npm run dev    - Start both together');
    console.log('  npm start      - Production mode');
  }
});