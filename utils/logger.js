const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '../logs');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  getTimestamp() {
    return new Date().toISOString();
  }

  formatMessage(level, message) {
    return `[${this.getTimestamp()}] [${level.toUpperCase()}] ${message}\n`;
  }

  writeToFile(level, message) {
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(this.logDir, `whatsapp-${today}.log`);
    
    fs.appendFileSync(logFile, this.formatMessage(level, message), 'utf8');
  }

  log(level, message) {
    const formattedMessage = this.formatMessage(level, message);
    
    // Console output with colors
    const colors = {
      info: '\x1b[36m', // cyan
      warn: '\x1b[33m', // yellow
      error: '\x1b[31m', // red
      debug: '\x1b[35m', // magenta
      reset: '\x1b[0m'
    };

    const color = colors[level] || colors.reset;
    console.log(`${color}${formattedMessage}${colors.reset}`);
    
    // File output
    this.writeToFile(level, message);
  }

  info(message) {
    this.log('info', message);
  }

  warn(message) {
    this.log('warn', message);
  }

  error(message) {
    this.log('error', message);
  }

  debug(message) {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message);
    }
  }
}

module.exports = new Logger();