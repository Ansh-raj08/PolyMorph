# Changelog

## PolyMorph V-1.0.0 (2026-04-06)

### Release Summary
- Production-ready core flow for PDF <-> Word conversion with a React frontend and Node.js (Express) backend.
- Real backend conversion and real binary download path are now active.
- Request tracing and validation were hardened to make failures explicit and debuggable.

### Progress Completed
- Frontend
  - Connected conversion modal to POST /upload/convert.
  - Added real converted file download using backend response paths.
  - Added fetch timeouts and actionable network/CORS error messages.
  - Added UI safeguards for unsupported conversion cards.
- Backend
  - Added robust conversion pipeline around LibreOffice with command logging and output checks.
  - Added file integrity validation middleware for uploaded files.
  - Added /debug/status diagnostic endpoint.
  - Added static serving for converted files from /outputs.
  - Added request-id tracing, route/controller logs, and centralized error logging.
  - Added process-level handlers for unhandled rejections and uncaught exceptions.
- Operations
  - Installed LibreOffice and verified headless conversion path.
  - Verified CORS behavior across local dev origins.

### Errors Faced and Solutions Imposed
1. Error faced: LibreOffice not available (soffice not found)
- Impact: Conversions failed before execution.
- Solution imposed: Installed LibreOffice and added robust binary path discovery and verification.

2. Error faced: Downloaded output opened as damaged file
- Impact: Files with .pdf extension were not valid PDFs.
- Root cause: Original uploaded blob was renamed on the client instead of downloading backend output.
- Solution imposed: Frontend now downloads convertedFile.filePath returned by backend.

3. Error faced: Convert action showed Load Failed
- Impact: Browser reported network failure during fetch.
- Root cause: Backend unavailable and/or CORS origin mismatch in dev.
- Solution imposed: Ensured backend is running on port 4000 and updated CORS policy to allow configured origins plus localhost/127.0.0.1 dev origins.

4. Error faced: Invalid or truncated uploads entered conversion flow
- Impact: Conversion failures and misleading output errors.
- Solution imposed: Added strict file integrity checks (size thresholds, signature checks, DOCX structure checks) before conversion.

5. Error faced: Hard to trace where requests failed
- Impact: Slow debugging cycles.
- Solution imposed: Added request lifecycle logs: request received, route hit, file received, conversion started, conversion finished, and error handler output with request ids.

### Verification Performed
- Health endpoint verified at /health.
- Dependency readiness verified at /debug/status.
- CORS verified for common local frontend origins.
- Error-path JSON responses verified for validation and missing-file cases.
- Successful conversion path verified with valid DOCX input and valid PDF output.
- Frontend production build verified with Vite.

### Current Supported Conversions
- PDF -> Word (.docx)
- Word (.docx) -> PDF

### Known Scope for V-1.0.0
- Converter cards outside PDF <-> Word are currently UI placeholders and not wired to backend conversion engines.

### Post V-1.0.0 Roadmap
- Add automated integration tests for upload, conversion, and download flows.
- Expand backend support for additional conversion categories shown in UI.
- Add queueing and progress streaming for larger conversions.
