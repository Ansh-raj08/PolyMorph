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
- Added environment-based API routing using VITE_API_URL
- Added clear feature boundaries in UI (Supported, Limited, Coming Soon)

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
- Added secure CORS origin controls for production + localhost in development
- Added automatic file cleanup service for /uploads and /outputs

### Conversion Availability

- Added async conversion flow with child_process.exec (non-blocking)
- Added LibreOffice conversion service using soffice --headless
- Stores converted output in outputs folder with unique names
- Stable:
	- Word (.docx) -> PDF
	- Excel (.xlsx) -> PDF
	- PowerPoint (.pptx) -> PDF
- Limited (best effort):
	- PDF -> Word (.docx)
- All other conversion cards are disabled as Coming Soon.

### Validation and Security Hardening

- Restricted accepted upload types to pdf/docx/xlsx/pptx for active conversion flow
- MIME type validation before conversion
- File extension validation before conversion
- File integrity checks before conversion:
	- File existence on disk
	- Minimum file size threshold
	- Header signature checks
		- PDF must start with %PDF-
		- DOCX/XLSX/PPTX must have ZIP signature
	- Basic OpenXML structure checks for DOCX/XLSX/PPTX
	- Best-effort scanned PDF detection warning
- Added clear error responses for unsupported/invalid files

### Debugging and Observability

- Added upload and conversion logs for:
	- Absolute file path
	- Uploaded and on-disk file size
	- Existence checks
	- LibreOffice command execution
	- stdout/stderr output from soffice
	- Command-level conversion attempts and failure metadata
	- Request received, route hit, conversion start/finish, and error traces

### Cleanup and Retention

- Automatic cleanup job removes stale files from:
	- uploads/
	- outputs/
- Default retention: 15 minutes
- Default sweep interval: 5 minutes
- Configurable via FILE_TTL_MS and FILE_CLEANUP_INTERVAL_MS

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
- NODE_ENV=development
- FRONTEND_ORIGIN=http://localhost:5173,https://your-polymorph.vercel.app
- CORS_ALLOWED_ORIGINS=
- VITE_API_URL=http://localhost:4000
- FILE_TTL_MS=900000
- FILE_CLEANUP_INTERVAL_MS=300000
- REQUEST_TIMEOUT_MS=240000

## Deployment (Vercel + Railway/Render)

### Frontend (Vercel)

1. Deploy frontend from this repo to Vercel.
2. Set frontend environment variable in Vercel:
	- VITE_API_URL=https://your-backend-domain
3. Re-deploy frontend after setting env values.

### Backend (Railway/Render)

1. Deploy backend as a separate Node service (same repo, backend runtime).
2. Set backend environment variables:
	- NODE_ENV=production
	- FRONTEND_ORIGIN=https://your-polymorph.vercel.app
	- CORS_ALLOWED_ORIGINS=https://your-extra-allowed-origin (optional)
	- FILE_TTL_MS=900000
	- FILE_CLEANUP_INTERVAL_MS=300000
	- REQUEST_TIMEOUT_MS=240000
	- PORT is usually platform-managed (set only if your host requires it)
3. Ensure LibreOffice is available in the backend runtime.

## Environment Matrix

### Frontend (Vite / Vercel)

| Environment | Variable | Value |
| --- | --- | --- |
| Local development | VITE_API_URL | http://localhost:4000 |
| Vercel Preview | VITE_API_URL | https://your-backend-staging-domain |
| Vercel Production | VITE_API_URL | https://your-backend-production-domain |
| Local UI + ngrok backend | VITE_API_URL | https://your-ngrok-subdomain.ngrok-free.app |

### Backend (Railway / Render)

| Environment | Variable | Value |
| --- | --- | --- |
| Local development | NODE_ENV | development |
| Local development | FRONTEND_ORIGIN | http://localhost:5173 |
| Local development | FILE_TTL_MS | 900000 |
| Local development | FILE_CLEANUP_INTERVAL_MS | 300000 |
| Local development | REQUEST_TIMEOUT_MS | 240000 |
| Staging | NODE_ENV | production |
| Staging | FRONTEND_ORIGIN | https://your-vercel-preview-domain |
| Staging | CORS_ALLOWED_ORIGINS | https://your-extra-allowed-origin |
| Staging | FILE_TTL_MS | 900000 |
| Staging | FILE_CLEANUP_INTERVAL_MS | 300000 |
| Staging | REQUEST_TIMEOUT_MS | 240000 |
| Production | NODE_ENV | production |
| Production | FRONTEND_ORIGIN | https://your-polymorph.vercel.app |
| Production | CORS_ALLOWED_ORIGINS | (optional, comma-separated additional origins) |
| Production | FILE_TTL_MS | 900000 |
| Production | FILE_CLEANUP_INTERVAL_MS | 300000 |
| Production | REQUEST_TIMEOUT_MS | 240000 |

Notes:
- On Railway/Render, PORT is typically injected by the platform. Keep local PORT in your local .env only.
- Never set VITE_API_URL to localhost for deployed Vercel environments.

### Copy/Paste Presets

Local frontend (.env):

```bash
VITE_API_URL=http://localhost:4000
```

Vercel frontend (production):

```bash
VITE_API_URL=https://your-backend-production-domain
```

Backend production (Railway/Render):

```bash
NODE_ENV=production
FRONTEND_ORIGIN=https://your-polymorph.vercel.app
FILE_TTL_MS=900000
FILE_CLEANUP_INTERVAL_MS=300000
REQUEST_TIMEOUT_MS=240000
```

Backend staging (Railway/Render):

```bash
NODE_ENV=production
FRONTEND_ORIGIN=https://your-vercel-preview-domain
CORS_ALLOWED_ORIGINS=https://your-team-qa-domain
FILE_TTL_MS=900000
FILE_CLEANUP_INTERVAL_MS=300000
REQUEST_TIMEOUT_MS=240000
```

### Local Backend Testing with Ngrok

1. Run backend locally: npm run server
2. Start ngrok tunnel: ngrok http 4000
3. Copy generated https URL (example: https://abc123.ngrok-free.app)
4. Set frontend env for test session:
	- VITE_API_URL=https://abc123.ngrok-free.app
5. If needed, add your frontend origin to backend FRONTEND_ORIGIN.

## Debugging Checklist

- Check backend reachability:
	- GET /health returns status ok
- Check dependency readiness:
	- GET /debug/status reports LibreOffice installed
- Confirm frontend API target:
	- VITE_API_URL points to deployed backend (not localhost in production)
- Confirm CORS:
	- FRONTEND_ORIGIN includes your active frontend origin
- Check upload integrity:
	- Uploaded file exists, non-zero size, valid signature
- Check conversion logs:
	- Request received
	- File uploaded
	- Conversion started
	- Conversion finished or failed with detailed message

## Next Planned Steps

- Add automated integration tests for upload, conversion, and download flows
- Expand backend conversion support for additional UI conversion categories
- Add queueing and progress streaming for large files
