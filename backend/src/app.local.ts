import { errors } from 'celebrate'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, { json, urlencoded } from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import mongoose from 'mongoose'
import path from 'path'
import { DB_ADDRESS, PORT } from './config.local'
import errorHandler from './middlewares/error-handler'
import serveStatic from './middlewares/serverStatic'
import routes from './routes'
import { csrfProtection, setCSRFToken } from './middlewares/csrf'
import { querySanitizer } from './middlewares/query-sanitizer'

const app = express()

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

// Диагностический middleware - должен быть ПЕРВЫМ
app.use((req, _res, next) => {
    console.log(`🔍 FIRST MIDDLEWARE: ${req.method} ${req.path}`);
    next();
});

app.set('trust proxy', 1) // Доверяем первому прокси

// Rate Limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: '{"error": "Слишком много запросов с этого IP, попробуйте позже"}',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);
app.use(cors({ origin: "http://localhost:5173", credentials: true }))
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}))
app.use(cookieParser())

// ⚠️ Пробуем разные варианты размещения serveStatic

// Вариант 1: Для всех запросов
console.log('🛡️ Setup serveStatic for all requests...');
app.use(serveStatic(path.join(__dirname, 'public')));

// Вариант 2: Только для корневых путей (если вариант 1 не работает)
app.use('/', serveStatic(path.join(__dirname, 'public')));

app.use(urlencoded({ extended: true, limit: '1mb' }))
app.use(json({ limit: '1mb' }))
app.options('*', cors())

// Диагностика перед роутами
app.use((req, _res, next) => {
    console.log(`🔍 BEFORE ROUTES: ${req.method} ${req.path}`);
    next();
});

app.use(routes)

// Диагностика после роутов
app.use((req, _res, next) => {
    console.log(`🔍 AFTER ROUTES: ${req.method} ${req.path} - NOT HANDLED`);
    next();
});

app.use(errors())
app.use(errorHandler)
app.use(setCSRFToken)
app.use(csrfProtection)
app.use(querySanitizer)

const bootstrap = async () => {
    try {
        await mongoose.connect(DB_ADDRESS)
        await app.listen(PORT, () => console.log('✅ Server running with diagnostics'))
    } catch (error) {
        console.error(error)
    }
}

bootstrap()
