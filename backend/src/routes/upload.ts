import { Router } from 'express'
import { uploadFile } from '../controllers/upload'
import fileMiddleware from '../middlewares/file'
import { multerErrorHandler } from '../middlewares/multer-error-handler'

const uploadRouter = Router()
uploadRouter.post('/', fileMiddleware.single('file'), multerErrorHandler, uploadFile)

export default uploadRouter
