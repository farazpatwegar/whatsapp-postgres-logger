// message controller 
const MessageService = require('../services/messageService');
const { validateMessageFilters } = require('../utils/validators');
const logger = require('../utils/logger');

class MessageController {
  constructor() {
    this.messageService = new MessageService();
  }

  async getMessages(req, res, next) {
    try {
      const filters = validateMessageFilters(req.query);
      const result = await this.messageService.getMessages(filters);
      
      res.json({
        success: true,
        data: result.messages,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          pages: result.pages
        }
      });
    } catch (error) {
      logger.error('Error in getMessages controller:', error);
      next(error);
    }
  }

  async getMessageStats(req, res, next) {
    try {
      const stats = await this.messageService.getStatistics();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error in getMessageStats controller:', error);
      next(error);
    }
  }

  async getSenders(req, res, next) {
    try {
      const senders = await this.messageService.getSenders();
      
      res.json({
        success: true,
        data: senders
      });
    } catch (error) {
      logger.error('Error in getSenders controller:', error);
      next(error);
    }
  }
}

module.exports = MessageController;