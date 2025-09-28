# 📩 WhatsApp Postgres Logger

![Node.js](https://img.shields.io/badge/Node.js-18.x-green?logo=node.js)
![Express](https://img.shields.io/badge/Express.js-4.x-lightgrey?logo=express)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15.x-blue?logo=postgresql)
![whatsapp-web.js](https://img.shields.io/badge/WhatsApp--Web.js-latest-brightgreen)
![License](https://img.shields.io/badge/License-MIT-yellow)

A Node.js based **WhatsApp message logger** that uses  
[whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) to connect to WhatsApp Web,  
captures incoming/outgoing messages, and stores them in a **PostgreSQL database**.  

It also provides:
- A REST API to fetch messages & stats  
- A lightweight dashboard UI to visualize logs  

---

## 🚀 Features
- ✅ Logs **all WhatsApp messages** (sent & received)
- ✅ Auto-creates and manages PostgreSQL table
- ✅ Stores message ID, sender, type, timestamp, group info
- ✅ REST API for messages, stats, and WhatsApp client status
- ✅ Dashboard for quick viewing
- ✅ Graceful shutdown & auto reconnect

---

## 📂 Project Structure

whatsapp-postgres-logger/
├── config/ # Configuration (db, whatsapp client)
├── controllers/ # Controllers for API routes
├── models/ # Database models
├── routes/ # API and web routes
├── services/ # Core services (WhatsApp, message, storage)
├── public/ # Frontend (CSS, JS, images, index.html)
├── views/ # HTML views (dashboard, partials)
├── scripts/ # Helper scripts (init-db, backup-db)
├── sessions/ # WhatsApp sessions (auto)
├── logs/ # Log files (auto)
├── utils/ # Utilities (logger, helpers, validators)
├── middleware/ # Middleware (auth, validation, error handler)
├── .env # Environment config
├── index.js # Main entry point
└── README.md


---

## ⚙️ Setup Guide


### 1️⃣ Clone repository

git clone https://github.com/<your-username>/whatsapp-postgres-logger.git

cd whatsapp-postgres-logger

2️⃣ Install dependencies
npm install

3️⃣ Configure .env
Create .env file in root:

ini
Copy code
PORT
=
3000

DB_USER
=your_db_user
DB_HOST
=localhost
DB_NAME
=your_db_name
DB_PASSWORD
=your_db_password
DB_PORT
=
5432

4️⃣ Run PostgreSQL
Make sure PostgreSQL service is running and DB is accessible.

5️⃣ Start the app
bash
Copy code
node index.js
6️⃣ Scan QR Code
On first run, scan the QR code in terminal using WhatsApp on your phone.
Session will be saved in /sessions, so you won’t need to re-scan every time.

📡 API Endpoints
Method	Endpoint	Description
GET	/api/messages	Fetch messages (with limit/offset)
GET	/api/stats	Get message stats + top senders
GET	/api/status	WhatsApp client status + QR code

🖥️ Dashboard
After starting server, open:
👉 http://localhost:3000

🛠️ Scripts
scripts/init-db.js → Initialize DB schema

scripts/backup-db.js → Backup messages

🤝 Contributing
Fork the repo

Create feature branch (git checkout -b feature/your-feature)

Commit changes (git commit -m "Add new feature")

Push to branch (git push origin feature/your-feature)

Create Pull Request

📜 License
This project is licensed under the MIT License.
Feel free to use and modify for personal or commercial projects.