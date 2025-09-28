// whatsapp client configuration 
const whatsappConfig = {
  authStrategy: {
    clientId: 'whatsapp-logger-v1',
    dataPath: './sessions',
    backupPath: './sessions/backup'
  },
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
      '--disable-gpu',
      '--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ],
    timeout: 60000
  },
  webVersion: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
  },
  sessionTimeout: 60000,
  maxReconnectAttempts: 5
};

module.exports = whatsappConfig;