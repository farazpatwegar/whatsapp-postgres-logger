// whatsapp service 
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const whatsappConfig = require('../config/whatsapp');
const logger = require('../utils/logger');

class WhatsAppService {
  constructor(databaseService) {
    this.databaseService = databaseService;
    this.client = null;
    this.qrCode = null;
    this.isReady = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = whatsappConfig.maxReconnectAttempts;
  }

  async initialize() {
    try {
      this.client = new Client({
        authStrategy: new LocalAuth(whatsappConfig.authStrategy),
        puppeteer: whatsappConfig.puppeteer,
        webVersionCache: whatsappConfig.webVersion
      });

      this.setupEventHandlers();
      await this.client.initialize();
      
      logger.info('WhatsApp client initialization started');
    } catch (error) {
      logger.error('WhatsApp initialization failed:', error);
      throw error;
    }
  }

  setupEventHandlers() {
    this.client.on('qr', (qr) => {
      this.handleQRCode(qr);
    });

    this.client.on('ready', () => {
      this.handleReady();
    });

    this.client.on('authenticated', () => {
      this.handleAuthenticated();
    });

    this.client.on('auth_failure', (error) => {
      this.handleAuthFailure(error);
    });

    this.client.on('message', async (message) => {
      await this.handleMessage(message);
    });

    this.client.on('message_create', async (message) => {
      await this.handleSentMessage(message);
    });

    this.client.on('disconnected', (reason) => {
      this.handleDisconnected(reason);
    });

    this.client.on('change_state', (state) => {
      logger.info(`WhatsApp state changed: ${state}`);
    });
  }

  handleQRCode(qr) {
    this.qrCode = qr;
    this.isReady = false;
    
    logger.info('QR Code received - please scan with WhatsApp');
    console.log('\n📲 Scan the QR code below:\n');
    qrcode.generate(qr, { small: true });
  }

  handleReady() {
    this.qrCode = null;
    this.isReady = true;
    this.reconnectAttempts = 0;
    
    const userInfo = this.client.info;
    logger.info(`WhatsApp client ready - Connected as: ${userInfo.pushname}`);
    console.log(`✅ WhatsApp connected as: ${userInfo.pushname}`);
    console.log(`📱 Phone: ${userInfo.wid.user}`);
    console.log(`🖥️ Platform: ${userInfo.platform}`);
  }

  handleAuthenticated() {
    logger.info('WhatsApp authenticated successfully');
    this.reconnectAttempts = 0;
  }

  handleAuthFailure(error) {
    this.isReady = false;
    logger.error('WhatsApp authentication failed:', error);
  }

  async handleMessage(message) {
    if (!this.isReady) return;

    try {
      const messageData = await this.processMessage(message);
      await this.databaseService.saveMessage(messageData);
      
      logger.info(`Message received from ${messageData.sender_name}`);
    } catch (error) {
      logger.error('Error processing incoming message:', error);
    }
  }

  async handleSentMessage(message) {
    if (!this.isReady || !message.fromMe) return;

    try {
      const messageData = await this.processMessage(message);
      await this.databaseService.saveMessage(messageData);
      
      logger.info(`Message sent to ${messageData.sender_name}`);
    } catch (error) {
      logger.error('Error processing sent message:', error);
    }
  }

  async processMessage(message) {
    let senderName = message.from;
    let isGroup = false;
    let groupName = null;
    let hasMedia = message.hasMedia;
    let mediaFilename = null;

    // Process group messages
    if (message.from.endsWith('@g.us')) {
      isGroup = true;
      try {
        const chat = await message.getChat();
        groupName = chat.name;
      } catch (error) {
        logger.warn('Could not fetch group info for message:', message.id._serialized);
      }
    }

    // Get contact information
    try {
      const contact = await message.getContact();
      senderName = contact.name || contact.pushname || contact.number || message.from;
    } catch (error) {
      logger.warn('Could not fetch contact info for message:', message.id._serialized);
    }

    // Handle media
    if (hasMedia) {
      try {
        const media = await message.downloadMedia();
        if (media) {
          mediaFilename = `media_${message.id._serialized}.${media.mimetype.split('/')[1]}`;
          // In production, save the file to disk or cloud storage
        }
      } catch (error) {
        logger.error('Error downloading media:', error);
      }
    }

    return {
      message_id: message.id._serialized,
      sender: message.from,
      sender_name: senderName,
      message: message.body || '',
      message_type: message.type,
      timestamp: message.timestamp,
      is_group: isGroup,
      group_name: groupName,
      from_me: message.fromMe || false,
      has_media: hasMedia,
      media_filename: mediaFilename
    };
  }

  handleDisconnected(reason) {
    this.isReady = false;
    logger.warn(`WhatsApp disconnected: ${reason}`);
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      
      logger.info(`Reconnecting in ${delay/1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.client.initialize().catch(error => {
          logger.error('Reconnection failed:', error);
        });
      }, delay);
    } else {
      logger.error(`Max reconnection attempts (${this.maxReconnectAttempts}) reached`);
    }
  }

  async destroy() {
    if (this.client) {
      await this.client.destroy();
      logger.info('WhatsApp client destroyed');
    }
  }

  getStatus() {
    return {
      isReady: this.isReady,
      qrCode: this.qrCode,
      userInfo: this.client?.info ? {
        name: this.client.info.pushname,
        number: this.client.info.wid.user,
        platform: this.client.info.platform
      } : null,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

module.exports = WhatsAppService;