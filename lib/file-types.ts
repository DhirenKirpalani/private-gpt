// Shared file type config for uploads across the app.
// Covers Microsoft Office, Google Docs/Sheets exports, PDFs, plain text, and related formats.

export const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  // Microsoft Word / Google Docs exported as Word
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  // Microsoft Excel / Google Sheets exported as Excel
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  // Microsoft PowerPoint / Google Slides exported as PowerPoint
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  // Plain text / markup
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "text/html",
  "text/csv",
  "text/xml",
  "application/xml",
  "application/json",
  "application/rtf",
  "text/rtf",
  "application/epub+zip",
  // Fallback for browsers that cannot detect the exact Office MIME type (common on some Windows / Google Drive downloads)
  "application/octet-stream",
]

export const ACCEPTED_EXTENSIONS = [
  "pdf",
  "docx",
  "doc",
  "xlsx",
  "xls",
  "csv",
  "pptx",
  "ppt",
  "txt",
  "md",
  "markdown",
  "html",
  "htm",
  "xml",
  "json",
  "rtf",
  "epub",
]

export function getFileExt(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || ""
}

export function isAcceptedFile(file: File): boolean {
  return (
    ACCEPTED_MIME_TYPES.includes(file.type) ||
    ACCEPTED_EXTENSIONS.includes(getFileExt(file.name))
  )
}

export function isCountableDocument(file: File): boolean {
  const countableMimeTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
  ]
  const countableExts = ["pdf", "docx", "doc"]
  return (
    countableMimeTypes.includes(file.type) ||
    countableExts.includes(getFileExt(file.name))
  )
}

export function isSpreadsheet(file: File): boolean {
  const spreadsheetMimeTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/csv",
  ]
  const spreadsheetExts = ["xlsx", "xls", "csv"]
  return (
    spreadsheetMimeTypes.includes(file.type) ||
    spreadsheetExts.includes(getFileExt(file.name))
  )
}
