require('dotenv').config();
const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// ====================
// PostgreSQL Connection
// ====================
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

// Test database connection
(async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL database');
    
    // Ensure messages table exists
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
        group_name VARCHAR(255)
      )
    `);
    console.log('✅ Database table ready');
    client.release();
  } catch (err) {
    console.error('❌ Database connection error:', err.message);
  }
})();

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// API to get messages
app.get('/api/messages', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const result = await pool.query(
      'SELECT * FROM whatsapp_messages ORDER BY timestamp DESC LIMIT $1 OFFSET $2',
      [parseInt(limit), parseInt(offset)]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
});

// API to get message statistics
app.get('/api/stats', async (req, res) => {
  try {
    const totalMessages = await pool.query('SELECT COUNT(*) FROM whatsapp_messages');
    const sendersStats = await pool.query(`
      SELECT sender, COUNT(*) as message_count 
      FROM whatsapp_messages 
      GROUP BY sender 
      ORDER BY message_count DESC
      LIMIT 10
    `);
    
    res.json({
      success: true,
      data: {
        totalMessages: parseInt(totalMessages.rows[0].count),
        topSenders: sendersStats.rows
      }
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
  }
});

// API to get QR code status
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    data: {
      whatsappStatus: client.info ? 'authenticated' : (qrCode ? 'waiting' : 'initializing'),
      qrCode: qrCode || null,
      userInfo: client.info || null
    }
  });
});

// WhatsApp Client Setup with fixed web version
let qrCode = null;
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: './sessions'
  }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ]
  },
  // FIX: Use a compatible web version
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
  }
});

// QR Code Generation
client.on('qr', (qr) => {
  qrCode = qr;
  console.log('📲 Scan the QR code below with WhatsApp:');
  qrcode.generate(qr, { small: true });
});

// Save messages to database
client.on('message', async (msg) => {
  console.log('📩 New message received:', {
    from: msg.from,
    body: msg.body,
    fromMe: msg.fromMe,
    type: msg.type
  });

  // Store all messages (both sent and received)
  try {
    let senderName = msg.from;
    let isGroup = false;
    let groupName = null;
    
    // Check if it's a group message
    if (msg.from.endsWith('@g.us')) {
      isGroup = true;
      try {
        const chat = await msg.getChat();
        groupName = chat.name;
      } catch (chatError) {
        console.log('Could not get group info');
      }
    }
    
    // Try to get contact info for better sender name
    try {
      const contact = await msg.getContact();
      senderName = contact.name || contact.pushname || contact.number || msg.from;
    } catch (contactError) {
      console.log('Could not get contact info, using default sender name');
    }
    
      console.log(msg);
    // Insert message into database
    const result = await pool.query(
      `INSERT INTO whatsapp_messages 
       (message_id, sender, sender_name, message, message_type, timestamp, is_group, group_name) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       ON CONFLICT (message_id) DO NOTHING
       RETURNING id`,
      [
        msg.id._serialized,
        msg.from,
        senderName,
        msg.body,
        msg.type,
        msg.timestamp,
        isGroup,
        groupName
      ]
    );
    
    if (result.rows.length > 0) {
      console.log(`✅ Message from ${senderName} stored in database with ID: ${result.rows[0].id}`);
    } else {
      console.log(`ℹ️ Message from ${senderName} already exists in database (not duplicated)`);
    }
  } catch (err) {
    console.error('❌ Error storing message:', err.message);
  }
});

// WhatsApp client events
client.on('ready', () => {
  qrCode = null;
  console.log('✅ WhatsApp client is ready!');
  console.log(`👤 Connected as: ${client.info.pushname}`);
});

client.on('authenticated', () => {
  console.log('✅ WhatsApp authenticated successfully');
});

client.on('auth_failure', (msg) => {
  console.error('❌ WhatsApp authentication failed:', msg);
});

client.on('disconnected', (reason) => {
  console.log('❌ WhatsApp client was logged out:', reason);
  console.log('🔄 Reinitializing client...');
  client.initialize();
});

// Initialize WhatsApp client
client.initialize();

// Start Express server
app.listen(port, () => {
  console.log(`🌐 Server running at http://localhost:${port}`);
  console.log('⏳ Initializing WhatsApp client...');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  try {
    await client.destroy();
    console.log('✅ WhatsApp client destroyed');
  } catch (e) {
    console.error('Error destroying client:', e);
  }
  try {
    await pool.end();
    console.log('✅ Database connection closed');
  } catch (e) {
    console.error('Error closing database connection:', e);
  }
  process.exit(0);
});