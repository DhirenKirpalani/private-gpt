# Troubleshooting: PDF Text Extraction Fails in Production

## Issue

PDF files (e.g., Banana Pancakes recipe) parse successfully on `localhost` but fail in production on `www.exploro-os.com` with the error:

> "PDF text extraction failed — document may be scanned/image-based"

## Root Cause

The application uses `pdf-parse` (v1.1.1) to extract text from PDF files. This library has a known issue with Next.js/webpack bundling:

1. **Webpack bundling issue**: `pdf-parse` v1.1.1 attempts to read a test file at `./test/data/05-versions-space.pdf` during module initialization. When webpack bundles the module, this relative path breaks, causing:
   ```
   ENOENT: no such file or directory, open './test/data/05-versions-space.pdf'
   ```

2. **`eval("require")` workaround fails in production**: Using `eval("require")("pdf-parse")` avoids webpack bundling locally, but in production (Vercel serverless functions), the `pdf-parse` package is not included in the deployment bundle, causing:
   ```
   Cannot find module 'pdf-parse'
   ```

3. **`pdfjs-dist` alternative fails in production**: `pdfjs-dist` v6.0.227 requires browser APIs (`DOMMatrix`, `ImageData`, `Path2D`) that do not exist in Node.js on Vercel, causing:
   ```
   DOMMatrix is not defined
   ```

## Symptoms

- PDF parsing works on `localhost` but fails on `www.exploro-os.com`
- Production logs show one of these errors:
  - `ENOENT: no such file or directory, open './test/data/05-versions-space.pdf'`
  - `Cannot find module 'pdf-parse'`
  - `DOMMatrix is not defined`
- The UI displays: "PDF text extraction failed — document may be scanned/image-based"
- The error message is misleading — the PDF may have valid embedded text

## Fix Applied

### 1. Next.js Configuration (`next.config.mjs`)

Added `serverComponentsExternalPackages` to tell Next.js to treat `pdf-parse` as an external Node.js module instead of bundling it with webpack:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse"],
  },
};

export default nextConfig;
```

This fixes:
- The `./test/data/05-versions-space.pdf` error (webpack no longer bundles the test file path)
- The `Cannot find module 'pdf-parse'` error (the package is now included in the Vercel deployment as an external dependency)

### 2. PDF Extraction Function (`app/api/parse-document/route.ts`)

Uses a standard `require("pdf-parse")` call (no `eval("require")` needed):

```typescript
export const runtime = "nodejs"  // Force Node.js runtime (not Edge)

async function extractPdfText(buffer: Buffer): Promise<string> {
  // pdf-parse v1.1.1: treated as external package via serverComponentsExternalPackages
  const pdfParse = require("pdf-parse")
  if (typeof pdfParse !== "function") {
    throw new Error("pdf-parse did not export a function, got: " + typeof pdfParse)
  }
  const data = await pdfParse(buffer)
  return data.text.trim()
}
```

Key elements:
- `export const runtime = "nodejs"` — forces Node.js runtime (not Edge runtime, which lacks Node.js APIs)
- `require("pdf-parse")` — standard require works because `serverComponentsExternalPackages` prevents webpack from bundling it

## Affected Files

| File | Change |
|------|--------|
| `next.config.mjs` | Added `serverComponentsExternalPackages: ["pdf-parse"]` |
| `app/api/parse-document/route.ts` | Added `export const runtime = "nodejs"`, reverted to `require("pdf-parse")` |

## Deployment Steps

The fix must be deployed to the **production branch** (`main`), not just `development`:

```bash
# Commit and push to development
git add .
git commit -m "fix: pdf-parse external package for production"
git push origin development
git push personal development

# Merge to main (Vercel deploys from main)
git checkout main
git merge development
git push origin main
git push personal main
```

Wait for Vercel to finish deploying, then test at `https://www.exploro-os.com/knowledge`.

## How to Verify the Fix

### Local Testing

1. Start dev server: `npm run dev`
2. Go to `http://localhost:3000/knowledge`
3. Upload a text-based PDF (e.g., `docs/Banana Pancakes Cost.pdf`)
4. Check terminal logs for:
   ```
   [PARSE-DOC PDF] pdf-parse loaded, type: function
   [PARSE-DOC PDF] Extracted pages: 1 text length: 1048
   ```
5. Verify extracted text appears in the knowledge base

### Production Testing

1. Go to `https://www.exploro-os.com/knowledge`
2. Upload the same PDF
3. Check Vercel logs (Dashboard → Project → Logs) for the same `[PARSE-DOC]` entries
4. Verify extracted text appears in the knowledge base

## Why `pdfjs-dist` Was Not Used

`pdfjs-dist` (v6.0.227) is already installed in the project but cannot be used in production because:

- It requires browser-only APIs: `DOMMatrix`, `ImageData`, `Path2D`
- These APIs do not exist in Node.js on Vercel serverless functions
- The `@napi-rs/canvas` package can polyfill some of these, but adding it increases bundle size significantly
- `pdf-parse` is simpler, lighter, and works correctly once the bundling issue is resolved

## Scanned/Image-Based PDFs

This fix only resolves the bundling/deployment issue. PDFs that are **scanned images** (not text-based) will still fail because `pdf-parse` cannot extract text from images.

### How to Identify Scanned PDFs

- Open the PDF in a browser or Adobe Reader
- Try to select/highlight text with your mouse
- If you cannot select text, the PDF is image-based (scanned)

### Solutions for Scanned PDFs

1. **OCR the PDF before uploading**:
   - Adobe Acrobat → Tools → Scan and OCR → Recognize Text
   - Google Drive: upload PDF → open with Google Docs → File → Download as PDF
   - Online tools: ilovepdf.com, smallpdf.com

2. **Add OCR support to the app** (future enhancement):
   - Install `tesseract.js` or `@napi-rs/canvas` + `pdfjs-dist`
   - Convert PDF pages to images, then run OCR
   - This increases serverless function execution time and memory usage

3. **Upload the original document instead**:
   - Use the Word/Excel/Google Docs version instead of a PDF
   - The app supports `.docx`, `.xlsx`, `.pptx`, `.txt`, `.csv`, and other formats

## Prevention

- Always test PDF parsing on production after deployment, not just locally
- Keep `serverComponentsExternalPackages` configured for any Node.js-native packages
- Monitor Vercel logs for `[PARSE-DOC]` errors after deployments
- Educate users to upload text-based PDFs or original document files
