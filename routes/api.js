// api routes 
const express = require('express');
const rateLimit = require('express-rate-limit');
const MessageController = require('../controllers/messageController');
const StatusController = require('../controllers/statusController');

const router = express.Router();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests, please try again later.'
  }
});

router.use(limiter);

// Initialize controllers
const messageController = new MessageController();
const statusController = new StatusController();

// Message routes
router.get('/messages', (req, res, next) => messageController.getMessages(req, res, next));
router.get('/stats', (req, res, next) => messageController.getMessageStats(req, res, next));
router.get('/senders', (req, res, next) => messageController.getSenders(req, res, next));

// Status routes
router.get('/status', (req, res, next) => statusController.getStatus(req, res, next));
router.get('/health', (req, res, next) => statusController.getHealth(req, res, next));

module.exports = router;