require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');

// Import configurations
const databaseConfig = require('./config/database');
const whatsappConfig = require('./config/whatsapp');

// Import services
const WhatsAppService = require('./services/whatsappService');
const DatabaseService = require('./services/storageService');

// Import routes
const apiRoutes = require('./routes/api');
const webRoutes = require('./routes/web');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

class WhatsAppLogger {
  constructor() {
    this.app = app;
    this.port = PORT;
    this.whatsappService = null;
    this.databaseService = null;
  }

  async initialize() {
    try {
      // Initialize services
      await this.initializeServices();
      
      // Setup middleware
      this.setupMiddleware();
      
      // Setup routes
      this.setupRoutes();
      
      // Setup error handling
      this.setupErrorHandling();
      
      // Start server
      this.startServer();
      
    } catch (error) {
      console.error('💥 Failed to initialize application:', error);
      process.exit(1);
    }
  }

  async initializeServices() {
    console.log('🔄 Initializing services...');
    
    // Initialize database
    this.databaseService = new DatabaseService();
    await this.databaseService.initialize();
    
    // Initialize WhatsApp
    this.whatsappService = new WhatsAppService(this.databaseService);
    await this.whatsappService.initialize();
    
    console.log('✅ All services initialized successfully');
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"]
        }
      }
    }));

    // CORS
    this.app.use(cors());

    // Compression
    this.app.use(compression());

    // Logging
    this.app.use(morgan('combined'));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Static files
    this.app.use(express.static(path.join(__dirname, 'public')));
  }

  setupRoutes() {
    // API routes
    this.app.use('/api', apiRoutes);
    
    // Web routes
    this.app.use('/', webRoutes);
  }

  setupErrorHandling() {
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Route not found'
      });
    });

    // Global error handler
    this.app.use(errorHandler);
  }

  startServer() {
    this.app.listen(this.port, () => {
      console.log(`🚀 Server running on http://localhost:${this.port}`);
      console.log('📊 Dashboard available at http://localhost:${this.port}');
      console.log('🔧 API endpoints available at http://localhost:${this.port}/api');
    });
  }

  async gracefulShutdown() {
    console.log('\n🛑 Initiating graceful shutdown...');
    
    try {
      if (this.whatsappService) {
        await this.whatsappService.destroy();
      }
      
      if (this.databaseService) {
        await this.databaseService.close();
      }
      
      console.log('✅ Shutdown completed successfully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Create and initialize application
const appInstance = new WhatsAppLogger();

// Handle graceful shutdown
process.on('SIGINT', () => appInstance.gracefulShutdown());
process.on('SIGTERM', () => appInstance.gracefulShutdown());

// Start the application
appInstance.initialize().catch(console.error);

module.exports = appInstance;