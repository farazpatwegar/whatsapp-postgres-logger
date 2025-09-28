// storage service 
const { pool } = require('../config/database');
const logger = require('../utils/logger');

class DatabaseService {
  constructor() {
    this.pool = pool;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      await this.createTables();
      await this.createIndexes();
      this.isInitialized = true;
      logger.info('Database service initialized');
    } catch (error) {
      logger.error('Database initialization failed:', error);
      throw error;
    }
  }

  async createTables() {
    const client = await this.pool.connect();
    
    try {
      // Messages table
      await client.query(`
        CREATE TABLE IF NOT EXISTS whatsapp_messages (
          id SERIAL PRIMARY KEY,
          message_id VARCHAR(255) UNIQUE NOT NULL,
          sender VARCHAR(255) NOT NULL,
          sender_name VARCHAR(255),
          message TEXT,
          message_type VARCHAR(50) DEFAULT 'text',
          timestamp BIGINT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          is_group BOOLEAN DEFAULT FALSE,
          group_name VARCHAR(255),
          from_me BOOLEAN DEFAULT FALSE,
          has_media BOOLEAN DEFAULT FALSE,
          media_filename VARCHAR(500),
          message_status VARCHAR(50) DEFAULT 'received'
        )
      `);

      // Statistics table
      await client.query(`
        CREATE TABLE IF NOT EXISTS message_statistics (
          id SERIAL PRIMARY KEY,
          date DATE UNIQUE NOT NULL,
          total_messages INTEGER DEFAULT 0,
          group_messages INTEGER DEFAULT 0,
          media_messages INTEGER DEFAULT 0,
          unique_senders INTEGER DEFAULT 0,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      logger.info('Database tables created successfully');
    } finally {
      client.release();
    }
  }

  async createIndexes() {
    const client = await this.pool.connect();
    
    try {
      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON whatsapp_messages(timestamp DESC)',
        'CREATE INDEX IF NOT EXISTS idx_messages_sender ON whatsapp_messages(sender)',
        'CREATE INDEX IF NOT EXISTS idx_messages_is_group ON whatsapp_messages(is_group)',
        'CREATE INDEX IF NOT EXISTS idx_messages_from_me ON whatsapp_messages(from_me)',
        'CREATE INDEX IF NOT EXISTS idx_messages_type ON whatsapp_messages(message_type)',
        'CREATE INDEX IF NOT EXISTS idx_statistics_date ON message_statistics(date DESC)'
      ];

      for (const indexQuery of indexes) {
        await client.query(indexQuery);
      }

      logger.info('Database indexes created successfully');
    } finally {
      client.release();
    }
  }

  async saveMessage(messageData) {
    const {
      message_id,
      sender,
      sender_name,
      message,
      message_type,
      timestamp,
      is_group,
      group_name,
      from_me,
      has_media,
      media_filename
    } = messageData;

    const query = `
      INSERT INTO whatsapp_messages 
      (message_id, sender, sender_name, message, message_type, timestamp, 
       is_group, group_name, from_me, has_media, media_filename) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
      ON CONFLICT (message_id) DO NOTHING
      RETURNING id
    `;

    const values = [
      message_id, sender, sender_name, message, message_type, timestamp,
      is_group, group_name, from_me, has_media, media_filename
    ];

    try {
      const result = await this.pool.query(query, values);
      return result.rows[0]?.id || null;
    } catch (error) {
      logger.error('Error saving message to database:', error);
      throw error;
    }
  }

  async getMessages(filters = {}) {
    const {
      page = 1,
      limit = 50,
      search,
      sender,
      is_group,
      message_type,
      start_date,
      end_date
    } = filters;

    const offset = (page - 1) * limit;
    let query = `
      SELECT 
        id, message_id, sender, sender_name, message,
        message_type, timestamp, created_at, is_group,
        group_name, from_me, has_media, media_filename,
        to_timestamp(timestamp) as readable_time
      FROM whatsapp_messages 
    `;
    
    let countQuery = 'SELECT COUNT(*) FROM whatsapp_messages';
    const params = [];
    const conditions = [];

    // Build filters
    if (sender) {
      conditions.push(`sender = $${params.length + 1}`);
      params.push(sender);
    }

    if (is_group !== undefined) {
      conditions.push(`is_group = $${params.length + 1}`);
      params.push(is_group === 'true');
    }

    if (message_type) {
      conditions.push(`message_type = $${params.length + 1}`);
      params.push(message_type);
    }

    if (search) {
      conditions.push(`message ILIKE $${params.length + 1}`);
      params.push(`%${search}%`);
    }

    if (start_date) {
      conditions.push(`to_timestamp(timestamp) >= $${params.length + 1}`);
      params.push(start_date);
    }

    if (end_date) {
      conditions.push(`to_timestamp(timestamp) <= $${params.length + 1}`);
      params.push(end_date);
    }

    // Add WHERE clause
    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      query += whereClause;
      countQuery += whereClause;
    }

    // Add pagination
    query += ` ORDER BY timestamp DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    try {
      const [messagesResult, countResult] = await Promise.all([
        this.pool.query(query, params),
        this.pool.query(countQuery, params.slice(0, -2))
      ]);

      return {
        messages: messagesResult.rows,
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(countResult.rows[0].count / limit)
      };
    } catch (error) {
      logger.error('Error fetching messages:', error);
      throw error;
    }
  }

  async getStatistics() {
    try {
      const [
        totalMessages,
        todayMessages,
        groupMessages,
        mediaMessages,
        topSenders,
        dailyActivity
      ] = await Promise.all([
        this.pool.query('SELECT COUNT(*) FROM whatsapp_messages'),
        this.pool.query(`
          SELECT COUNT(*) FROM whatsapp_messages 
          WHERE DATE(to_timestamp(timestamp)) = CURRENT_DATE
        `),
        this.pool.query('SELECT COUNT(*) FROM whatsapp_messages WHERE is_group = true'),
        this.pool.query('SELECT COUNT(*) FROM whatsapp_messages WHERE has_media = true'),
        this.pool.query(`
          SELECT sender, sender_name, COUNT(*) as message_count
          FROM whatsapp_messages 
          GROUP BY sender, sender_name 
          ORDER BY message_count DESC
          LIMIT 10
        `),
        this.pool.query(`
          SELECT DATE(to_timestamp(timestamp)) as date, COUNT(*) as message_count
          FROM whatsapp_messages 
          WHERE timestamp >= EXTRACT(EPOCH FROM (CURRENT_DATE - INTERVAL '30 days'))
          GROUP BY date
          ORDER BY date DESC
          LIMIT 30
        `)
      ]);

      return {
        totalMessages: parseInt(totalMessages.rows[0].count),
        todayMessages: parseInt(todayMessages.rows[0].count),
        groupMessages: parseInt(groupMessages.rows[0].count),
        mediaMessages: parseInt(mediaMessages.rows[0].count),
        topSenders: topSenders.rows,
        dailyActivity: dailyActivity.rows
      };
    } catch (error) {
      logger.error('Error fetching statistics:', error);
      throw error;
    }
  }

  async getSenders() {
    try {
      const result = await this.pool.query(`
        SELECT DISTINCT sender, sender_name, COUNT(*) as message_count
        FROM whatsapp_messages 
        GROUP BY sender, sender_name 
        ORDER BY sender_name
      `);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching senders:', error);
      throw error;
    }
  }

  async close() {
    await this.pool.end();
    logger.info('Database connections closed');
  }
}

module.exports = DatabaseService;