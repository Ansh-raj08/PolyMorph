# PolyMorph

Polymorph – A multi-format file conversion engine.

File converter web app with a React frontend and Node.js (Express) backend.

Last Updated: 2026-04-05

## Tech Stack

- Frontend: React, Vite, Tailwind CSS
- Backend: Node.js, Express, Multer
- Conversion Engine: LibreOffice CLI (soffice --headless)

## Current Progress (2026-04-05)

### Frontend

- Implemented dark SaaS-style dashboard UI with responsive layout
- Added sidebar categories (PDF, Word, Image, Audio, Video)
- Added interactive conversion cards
- Added conversion modal with drag and drop upload, file preview, progress bar, and download state
- Added upload integration example using FormData and API error/success handling

### Backend

- Implemented single file upload API using Multer diskStorage
- Stores uploads in uploads folder with unique file names
- Added CORS setup for frontend connection
- Added controller and route structure
- Added upload endpoint: POST /upload
- Added conversion endpoint: POST /upload/convert

### Conversion (PDF <-> Word)

- Added async conversion flow with child_process.exec (non-blocking)
- Added LibreOffice conversion service using soffice --headless
- Stores converted output in outputs folder with unique names
- Supports:
	- PDF -> Word (.docx)
	- Word (.docx) -> PDF

### Validation and Security Hardening

- Restricted accepted upload types to pdf and docx for conversion flow
- MIME type validation before conversion
- File extension validation before conversion
- File integrity checks before conversion:
	- File existence on disk
	- Minimum file size threshold
	- Header signature checks
		- PDF must start with %PDF-
		- DOCX must have ZIP signature
- Added clear error responses for unsupported/invalid files

### Debugging and Observability

- Added upload and conversion logs for:
	- Absolute file path
	- Uploaded and on-disk file size
	- Existence checks
	- LibreOffice command execution
	- stdout/stderr output from soffice

## Notes

- File integrity checks were added to reduce LibreOffice damaged file errors caused by mismatched MIME, extension spoofing, or truncated uploads.
- LibreOffice must be installed and available in PATH as soffice for conversion to work.

## Run Locally

1. Install dependencies:
	 npm install
2. Start frontend:
	 npm run dev
3. Start backend:
	 npm run server

## Environment

Use .env values similar to:

- PORT=4000
- FRONTEND_ORIGIN=http://localhost:5173
- VITE_API_BASE_URL=http://localhost:4000

## Next Planned Steps

- Add direct frontend wiring from conversion modal to POST /upload/convert
- Add download endpoint/served static outputs for converted files
- Add automated API tests for upload and conversion validation paths
