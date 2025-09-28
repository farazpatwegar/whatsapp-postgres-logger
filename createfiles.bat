@echo off

REM ========= CONFIG =========
mkdir config
echo // database configuration > config\database.js
echo // whatsapp client configuration > config\whatsapp.js

REM ========= CONTROLLERS =========
mkdir controllers
echo // message controller > controllers\messageController.js
echo // stats controller > controllers\statsController.js
echo // status controller > controllers\statusController.js

REM ========= MODELS =========
mkdir models
echo // message model > models\Message.js
echo // database model > models\Database.js

REM ========= ROUTES =========
mkdir routes
echo // api routes > routes\api.js
echo // web routes > routes\web.js

REM ========= SERVICES =========
mkdir services
echo // whatsapp service > services\whatsappService.js
echo // message service > services\messageService.js
echo // storage service > services\storageService.js

REM ========= PUBLIC =========
mkdir public
mkdir public\css
echo /* styles */ > public\css\style.css

mkdir public\js
echo // app js > public\js\app.js
echo // dashboard js > public\js\dashboard.js
echo // utils js > public\js\utils.js

mkdir public\images
echo (icon placeholder) > public\images\favicon.ico

echo <!DOCTYPE html^> > public\index.html
echo <html><head><title>WhatsApp Logger</title></head><body><h1>Hello</h1></body></html> >> public\index.html

REM ========= VIEWS =========
mkdir views
echo <!-- dashboard view --> > views\dashboard.html
mkdir views\partials

REM ========= SCRIPTS =========
mkdir scripts
echo // init database script > scripts\init-db.js
echo // backup database script > scripts\backup-db.js

REM ========= AUTO-GENERATED =========
mkdir sessions
mkdir logs

REM ========= UTILS =========
mkdir utils
echo // logger utility > utils\logger.js
echo // helper functions > utils\helpers.js
echo // validators > utils\validators.js

REM ========= MIDDLEWARE =========
mkdir middleware
echo // authentication middleware > middleware\auth.js
echo // validation middleware > middleware\validation.js
echo // error handler middleware > middleware\errorHandler.js


echo.
echo ✅ Project structure created successfully inside whatsapp-postgres-logger
pause
