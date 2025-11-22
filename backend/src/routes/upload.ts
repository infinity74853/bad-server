import { Router } from 'express'
import { uploadFile } from '../controllers/upload'
import fileMiddleware from '../middlewares/file'
import { multerErrorHandler } from '../middlewares/multer-error-handler'
import auth from '../middlewares/auth'

const uploadRouter = Router()
uploadRouter.post('/', auth, fileMiddleware.single('file'), multerErrorHandler, uploadFile)

export default uploadRouter
