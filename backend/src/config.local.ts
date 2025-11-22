import { CookieOptions } from 'express'
import ms from 'ms'

export const PORT = '3000'
export const DB_ADDRESS = 'mongodb://root:example@host.docker.internal:27017/weblarek?authSource=admin'
export const JWT_SECRET = 'JWT_SECRET'
export const ACCESS_TOKEN = {
    secret: 'secret-dev',
    expiry: '10m',
}
export const REFRESH_TOKEN = {
    secret: 'secret-dev',
    expiry: '7d',
    cookie: {
        name: 'refreshToken',
        options: {
            httpOnly: true,
            sameSite: 'lax',
            secure: false,
            maxAge: ms('7d'),
            path: '/',
        } as CookieOptions,
    },
}

export const CSRF_CONFIG = {
    tokenLength: 32,
    cookieName: 'XSRF-TOKEN',
    headerName: 'X-CSRF-Token',
    maxAge: 3600000, // 1 час
};
