# PolyMorph

Polymorph – A multi-format file conversion engine.

File converter web app with a React frontend and Node.js (Express) backend.

Current Version: PolyMorph V-1.0.0
Last Updated: 2026-04-06

## Release Notes

- See [CHANGELOG.md](CHANGELOG.md) for full V-1.0.0 release details.

## Tech Stack

- Frontend: React, Vite, Tailwind CSS
- Backend: Node.js, Express, Multer
- Conversion Engine: LibreOffice CLI (soffice --headless)

## Current Progress (2026-04-06)

### Frontend

- Implemented dark SaaS-style dashboard UI with responsive layout
- Added sidebar categories (PDF, Word, Image, Audio, Video)
- Added interactive conversion cards
- Added conversion modal with drag and drop upload, file preview, progress bar, and download state
- Added upload integration example using FormData and API error/success handling
- Wired conversion modal to backend POST /upload/convert
- Added real converted file download from backend outputs
- Added frontend request timeout and clearer "Load Failed" diagnostics

### Backend

- Implemented single file upload API using Multer diskStorage
- Stores uploads in uploads folder with unique file names
- Added CORS setup for frontend connection
- Added controller and route structure
- Added upload endpoint: POST /upload
- Added conversion endpoint: POST /upload/convert
- Added diagnostics endpoint: GET /debug/status
- Added static serving for converted files: /outputs/*
- Added request lifecycle logging with request IDs

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
	- Request received, route hit, conversion start/finish, and error traces

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

- Add automated integration tests for upload, conversion, and download flows
- Expand backend conversion support for additional UI conversion categories
- Add queueing and progress streaming for large files
