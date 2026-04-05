import { Router } from 'express'
import {
	convertUploadedFile,
	uploadSingleFile,
} from '../controllers/uploadController.js'
import { upload } from '../middleware/uploadMiddleware.js'

const router = Router()

router.post('/convert', upload.single('file'), convertUploadedFile)
router.post('/', upload.single('file'), uploadSingleFile)

export default router
