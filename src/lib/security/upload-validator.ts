/**
 * File Upload Validator (VUL-032)
 *
 * Validare strictă: dimensiune, tip MIME, extensie, magic bytes.
 */

// ── Limits ────────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const MAX_FILE_SIZE_LABEL = "10 MB"

// ── Allowed file types ────────────────────────────────────────────────────────

const ALLOWED_TYPES: Record<string, { mimeTypes: string[]; magicBytes?: number[][] }> = {
  ".xlsx": {
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ],
    // XLSX files are ZIP archives — start with PK (0x50, 0x4B)
    magicBytes: [[0x50, 0x4B, 0x03, 0x04]],
  },
  ".csv": {
    mimeTypes: ["text/csv", "application/csv", "text/plain"],
  },
  ".pdf": {
    mimeTypes: ["application/pdf"],
    magicBytes: [[0x25, 0x50, 0x44, 0x46]], // %PDF
  },
  ".docx": {
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    magicBytes: [[0x50, 0x4B, 0x03, 0x04]], // ZIP archive (DOCX = ZIP)
  },
  ".doc": {
    mimeTypes: ["application/msword"],
    magicBytes: [[0xD0, 0xCF, 0x11, 0xE0]], // OLE2 compound
  },
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UploadValidationResult {
  valid: boolean
  error?: string
}

// ── Main validator ────────────────────────────────────────────────────────────

export async function validateUpload(
  file: File,
  allowedExtensions?: string[]
): Promise<UploadValidationResult> {
  const extensions = allowedExtensions || Object.keys(ALLOWED_TYPES)

  // 1. Size check
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Fișierul depășește limita de ${MAX_FILE_SIZE_LABEL}. Dimensiune: ${(file.size / 1024 / 1024).toFixed(1)} MB`,
    }
  }

  if (file.size === 0) {
    return { valid: false, error: "Fișierul este gol." }
  }

  // 2. Extension check
  const fileName = file.name.toLowerCase()
  const ext = "." + fileName.split(".").pop()
  if (!extensions.includes(ext)) {
    return {
      valid: false,
      error: `Extensie nepermisă: ${ext}. Extensii acceptate: ${extensions.join(", ")}`,
    }
  }

  // 3. MIME type check
  const typeConfig = ALLOWED_TYPES[ext]
  if (typeConfig) {
    if (!typeConfig.mimeTypes.includes(file.type) && file.type !== "") {
      return {
        valid: false,
        error: `Tip MIME invalid: ${file.type}. Așteptat: ${typeConfig.mimeTypes.join(" sau ")}`,
      }
    }

    // 4. Magic bytes check (if configured)
    if (typeConfig.magicBytes) {
      const buffer = await file.slice(0, 8).arrayBuffer()
      const bytes = new Uint8Array(buffer)
      const matchesMagic = typeConfig.magicBytes.some((magic) =>
        magic.every((byte, i) => bytes[i] === byte)
      )
      if (!matchesMagic) {
        return {
          valid: false,
          error: "Conținutul fișierului nu corespunde extensiei declarate.",
        }
      }
    }
  }

  // 5. Filename sanitization check (no path traversal)
  if (fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
    return { valid: false, error: "Numele fișierului conține caractere nepermise." }
  }

  return { valid: true }
}

export { MAX_FILE_SIZE, MAX_FILE_SIZE_LABEL }
