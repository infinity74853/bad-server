import { errors } from 'celebrate'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, { json, urlencoded } from 'express'
import mongoose from 'mongoose'
import path from 'path'
import { DB_ADDRESS, PORT } from './config.local'
import errorHandler from './middlewares/error-handler'
import routes from './routes'

const app = express()

app.use(cookieParser())
app.use(cors({ origin: "http://localhost:5173", credentials: true }))
app.use(express.static(path.join(__dirname, 'public')))
app.use(urlencoded({ extended: true }))
app.use(json())
app.options('*', cors())
app.use(routes)
app.use(errors())
app.use(errorHandler)

const bootstrap = async () => {
    try {
        await mongoose.connect(DB_ADDRESS)
        await app.listen(PORT, () => console.log('ok - local development'))
    } catch (error) {
        console.error(error)
    }
}

bootstrap()
