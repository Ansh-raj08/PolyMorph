# File Conversion Pipeline Debug Guide

## Root Causes of "File is Damaged" Errors

Based on analysis of your pipeline, there are **three main causes**:

### 1. ❌ LibreOffice Not Installed
```
soffice: command not found
```
**Solution**: Install LibreOffice
```bash
# macOS
brew install --cask libreoffice

# Ubuntu/Debian
sudo apt-get install libreoffice

# Verify installation
/Applications/LibreOffice.app/Contents/MacOS/soffice --version
```

### 2. ❌ Invalid/Corrupted Source Files
Your uploaded "PDFs" contain:
```
XXXXXXXXXXXXXXXX  (just X characters)
not really a pdf file
```
But valid PDFs must start with `%PDF-` (hex: `25 50 44 46 2D`).

**Cause**: Files were uploaded with `.pdf` extension but aren't actual PDFs.

### 3. ❌ Incomplete File Transfers
Files may appear valid but be truncated mid-upload.

---

## Debug Tools Added

### 1. File Validation Middleware (`/backend/src/middleware/fileValidation.js`)
Validates file integrity **before** conversion:
- ✅ File exists on disk
- ✅ File size > 0
- ✅ File size matches reported size
- ✅ Magic bytes match extension (PDF=%PDF-, DOCX=PK..)
- ✅ DOCX internal structure valid

### 2. Enhanced LibreOffice Converter
- ✅ Searches multiple LibreOffice paths (especially macOS)
- ✅ Logs full command before execution
- ✅ Captures stdout/stderr
- ✅ Verifies output file integrity
- ✅ Detailed debug info attached to response

### 3. Debug Endpoint: `GET /debug/status`
```bash
curl http://localhost:4000/debug/status
```
Returns:
```json
{
  "status": "ready|degraded",
  "libreOffice": {
    "installed": true,
    "path": "/Applications/LibreOffice.app/Contents/MacOS/soffice",
    "version": "LibreOffice 7.6.x"
  }
}
```

### 4. CLI Debug Script
```bash
# Check LibreOffice installation
node backend/debug-conversion.js --check-libreoffice

# Debug a specific file
node backend/debug-conversion.js uploads/document.pdf
```

---

## How to Test Each Stage Independently

### Stage 1: Upload Validation
```bash
# Upload a fake file (should be rejected)
echo "not a pdf" > /tmp/fake.pdf
curl -X POST http://localhost:4000/upload/convert \
  -F "file=@/tmp/fake.pdf"
# Expected: 400 "File content does not match PDF format"
```

### Stage 2: LibreOffice Conversion
```bash
# Test LibreOffice directly
/Applications/LibreOffice.app/Contents/MacOS/soffice \
  --headless \
  --convert-to pdf \
  --outdir /tmp \
  /path/to/valid/document.docx

# Check output
ls -la /tmp/document.pdf
```

### Stage 3: Full Pipeline
```bash
# With a REAL PDF/DOCX file
curl -X POST http://localhost:4000/upload/convert \
  -F "file=@/path/to/real-document.pdf" \
  | jq .
```

---

## How Corruption Happens in This Pipeline

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│   Browser   │────▶│    multer    │────▶│  Validation │────▶│ LibreOffice  │
│  (upload)   │     │ (disk write) │     │ (integrity) │     │ (conversion) │
└─────────────┘     └──────────────┘     └─────────────┘     └──────────────┘
      │                    │                    │                    │
      ▼                    ▼                    ▼                    ▼
  CORRUPTION          CORRUPTION           REJECTION            FAILURE
  SOURCES:            SOURCES:             IF:                  IF:
  - Slow network      - Disk full          - Magic bytes        - soffice not
  - Client abort      - Permission         - Size mismatch        installed
  - Wrong MIME type     error              - Empty file         - Invalid file
                      - Race condition                          - Timeout
```

### Prevention Checklist:
1. ✅ Use `diskStorage` (not `memoryStorage`) - prevents memory issues
2. ✅ Validate file headers after upload - catches spoofed files
3. ✅ Compare file sizes (reported vs actual) - catches truncation
4. ✅ Use absolute paths with proper escaping - handles spaces
5. ✅ Find full LibreOffice path - doesn't rely on PATH
6. ✅ Add timeout to conversion - prevents hangs
7. ✅ Verify output file exists and size > 0 - catches silent failures

---

## Quick Fix Checklist

1. **Install LibreOffice**:
   ```bash
   brew install --cask libreoffice
   ```

2. **Verify with debug endpoint**:
   ```bash
   curl http://localhost:4000/debug/status | jq .
   ```

3. **Test with a REAL document** (not a fake file):
   - Download a sample PDF: https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf
   - Upload it through your app

4. **Check server logs** for detailed debug info at each step

---

## File Structure After Changes

```
backend/src/
├── app.js                    # Added /debug/status endpoint
├── middleware/
│   ├── fileValidation.js     # NEW: File integrity validation
│   └── uploadMiddleware.js   # Unchanged (multer config)
├── routes/
│   └── uploadRoutes.js       # Added validation middleware
├── services/
│   └── libreOfficeConverter.js  # Enhanced with debug logging
└── debug-conversion.js       # NEW: CLI debug tool
```
