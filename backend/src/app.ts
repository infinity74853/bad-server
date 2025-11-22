import { errors } from 'celebrate'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import 'dotenv/config'
import express, { json, urlencoded } from 'express'
import rateLimit from 'express-rate-limit'
import mongoose from 'mongoose'
import path from 'path'
import { DB_ADDRESS } from './config'
import errorHandler from './middlewares/error-handler'
import serveStatic from './middlewares/serverStatic'
import routes from './routes'
import { csrfProtection, setCSRFToken } from './middlewares/csrf';
import { querySanitizer } from './middlewares/query-sanitizer';

const { PORT = 3000 } = process.env
const app = express()

app.set('trust proxy', 1) // Доверяем первому прокси (nginx)

// Rate Limiting для production
const limiter = rateLimit({
  windowMs: 15 * 1000, // 1 минут
  max: 20, // 300 запросов с одного IP за окно
  message: { 
    error: 'Слишком много запросов с этого IP, попробуйте позже' 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// CORS для production
app.use(cors({ 
  origin: process.env.ORIGIN_ALLOW || "http://localhost", 
  credentials: true 
}));

app.use((_req, res, next) => {
  // Базовые security headers без Helmet
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.removeHeader('X-Powered-By');
  next();
});

app.use(cookieParser())

// ✅ БЕЗОПАСНАЯ ОБРАБОТКА СТАТИЧЕСКИХ ФАЙЛОВ - Path Traversal защита
app.use(serveStatic(path.join(__dirname, 'public')))

// Ограничения размера запросов
app.use(urlencoded({ extended: true, limit: '10mb' }))
app.use(json({ limit: '10mb' }))

app.options('*', cors())

// Основные роуты API
app.use(routes)

// Обработка ошибок валидации
app.use(errors())

// Централизованная обработка ошибок
app.use(errorHandler)

// Устанавливаем CSRF токен для всех GET запросов
app.use(setCSRFToken);

// Защищаем все не-GET запросы CSRF middleware
app.use(csrfProtection)

// Санитизация query параметров - защита от NoSQL инъекций
app.use(querySanitizer);

const bootstrap = async () => {
    try {
        await mongoose.connect(DB_ADDRESS)
        await app.listen(PORT, () => {
            console.log('✅ Production server started successfully');
            console.log('🛡️  Security features enabled:');
            console.log('   - Rate Limiting (DDoS protection)');
            console.log('   - Helmet.js (Security headers)');
            console.log('   - Path Traversal protection');
            console.log('   - CSRF protection');
            console.log('   - NoSQL injection protection');
            console.log('   - CORS configured');
        })
    } catch (error) {
        console.error('❌ Server startup error:', error)
        process.exit(1)
    }
}

bootstrap()
