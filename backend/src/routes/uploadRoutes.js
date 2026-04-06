import { Router } from 'express'
import {
	convertUploadedFile,
	uploadSingleFile,
} from '../controllers/uploadController.js'
import { upload } from '../middleware/uploadMiddleware.js'
import { validateFileIntegrity } from '../middleware/fileValidation.js'

const router = Router()

const logRouteHit = (req, _res, next) => {
	console.info(`[Request ${req.requestId || 'n/a'}] Upload route hit`, {
		method: req.method,
		path: req.originalUrl,
		contentType: req.headers['content-type'] || null,
	})

	next()
}

// Conversion endpoint with full validation
router.post('/convert', logRouteHit, upload.single('file'), validateFileIntegrity, convertUploadedFile)

// Simple upload (still validate integrity)
router.post('/', logRouteHit, upload.single('file'), validateFileIntegrity, uploadSingleFile)

export default router
