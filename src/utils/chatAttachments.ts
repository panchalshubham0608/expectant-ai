import type { ChatAttachmentMeta, ChatAttachmentSource } from '../models/chat';

export interface ChatAttachmentInput extends ChatAttachmentMeta {
  file: File;
  base64Data: string;
}

export const MAX_CHAT_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB per file
export const MAX_CHAT_ATTACHMENTS_COUNT = 5;
const MAX_INLINE_PDF_PERSIST_BYTES = 300 * 1024; // 300 KB raw (~400 KB base64) for Firestore fallback
const MAX_TEXT_PREVIEW_CHARS = 12000;

// In-memory Blob URLs for instant, zero-latency full preview during the active browser session
const sessionAttachmentUrls = new Map<string, string>();

export const getSessionAttachmentUrl = (id: string): string | undefined =>
  sessionAttachmentUrls.get(id);

export const convertDataUrlToBlobUrl = (dataUrl: string): string | null => {
  try {
    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx === -1) return null;
    const header = dataUrl.slice(0, commaIdx);
    const base64 = dataUrl.slice(commaIdx + 1);
    const mimeMatch = header.match(/^data:([^;]+);base64$/i);
    const mimeType = mimeMatch?.[1] || 'application/octet-stream';

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: mimeType });
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
};

export const getGoogleDriveEmbedUrl = (driveUrl?: string): string | null => {
  if (!driveUrl) return null;
  const match = driveUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match?.[1]) {
    return `https://drive.google.com/file/d/${match[1]}/preview`;
  }
  return null;
};

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
]);

const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'text/csv',
  'text/markdown',
]);

const EXTENSION_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
  pdf: 'application/pdf',
  txt: 'text/plain',
  csv: 'text/csv',
  md: 'text/markdown',
};

/**
 * Sanitizes a user-supplied filename by stripping path traversal sequences,
 * directory separators, and control characters.
 */
export const sanitizeAttachmentFileName = (rawName: string): string => {
  const baseName = rawName.split(/[/\\]/).pop() ?? 'attachment';
  const withoutControlChars = Array.from(baseName)
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join('');

  const cleaned = withoutControlChars
    .replace(/\.\.+/g, '.')
    .replace(/[<>:"|?*]/g, '_')
    .trim();

  if (!cleaned || cleaned === '.') {
    return 'attachment';
  }

  return cleaned.length > 100 ? cleaned.slice(0, 100) : cleaned;
};

export const formatAttachmentSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
};

export const isImageMimeType = (mimeType: string): boolean =>
  mimeType.toLowerCase().startsWith('image/');

export const resolveAttachmentMimeType = (file: File): string | null => {
  const rawType = (file.type || '').trim().toLowerCase();
  if (
    ALLOWED_IMAGE_MIME_TYPES.has(rawType) ||
    ALLOWED_DOCUMENT_MIME_TYPES.has(rawType)
  ) {
    return rawType;
  }

  const ext = file.name.split('.').pop()?.trim().toLowerCase() ?? '';
  const mapped = EXTENSION_TO_MIME[ext];
  if (mapped) {
    return mapped;
  }

  return null;
};

/**
 * Inspects file header magic bytes to confirm the file content matches
 * the expected allow-listed MIME type.
 */
const verifyFileSignature = async (
  file: File,
  mimeType: string
): Promise<boolean> => {
  const sliceLen = mimeType.startsWith('text/') ? 512 : 16;
  const buffer = await file.slice(0, sliceLen).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (bytes.length === 0) return false;

  if (mimeType === 'application/pdf') {
    // %PDF-
    return (
      bytes.length >= 5 &&
      bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46 &&
      bytes[4] === 0x2d
    );
  }

  if (mimeType === 'image/jpeg') {
    return (
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    );
  }

  if (mimeType === 'image/png') {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }

  if (mimeType === 'image/gif') {
    // GIF87a or GIF89a
    return (
      bytes.length >= 6 &&
      bytes[0] === 0x47 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x38 &&
      (bytes[4] === 0x37 || bytes[4] === 0x39) &&
      bytes[5] === 0x61
    );
  }

  if (mimeType === 'image/webp') {
    // RIFF....WEBP
    return (
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    );
  }

  if (mimeType === 'image/heic' || mimeType === 'image/heif') {
    // ISO Base Media File Format: bytes 4..7 == 'ftyp'
    return (
      bytes.length >= 12 &&
      bytes[4] === 0x66 &&
      bytes[5] === 0x74 &&
      bytes[6] === 0x79 &&
      bytes[7] === 0x70
    );
  }

  if (mimeType.startsWith('text/')) {
    for (let i = 0; i < bytes.length; i++) {
      if (bytes[i] === 0x00) return false;
    }
    return true;
  }

  return false;
};

export const encodeFileToBase64 = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';

  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }

  return btoa(binary);
};

const createImagePreviewDataUrl = (
  file: File,
  maxDimension = 720
): Promise<string | undefined> =>
  new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
    };

    img.onload = () => {
      try {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        if (!width || !height) {
          cleanup();
          resolve(undefined);
          return;
        }

        const scale = Math.min(1, maxDimension / Math.max(width, height));
        const targetWidth = Math.max(1, Math.round(width * scale));
        const targetHeight = Math.max(1, Math.round(height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          resolve(undefined);
          return;
        }

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.76);
        cleanup();
        resolve(dataUrl);
      } catch {
        cleanup();
        resolve(undefined);
      }
    };

    img.onerror = () => {
      cleanup();
      resolve(undefined);
    };

    img.src = objectUrl;
  });

const readTextFilePreview = async (file: File): Promise<string | undefined> => {
  try {
    const text = await file.slice(0, MAX_TEXT_PREVIEW_CHARS).text();
    return text.trim() ? text : undefined;
  } catch {
    return undefined;
  }
};

export const prepareChatAttachment = async (
  file: File,
  source: ChatAttachmentSource
): Promise<ChatAttachmentInput> => {
  const safeName = sanitizeAttachmentFileName(file.name);

  if (file.size <= 0) {
    throw new Error(`"${safeName}" is empty. Please choose a valid file.`);
  }

  if (file.size > MAX_CHAT_ATTACHMENT_SIZE_BYTES) {
    throw new Error(
      `"${safeName}" exceeds the 10 MB size limit (${formatAttachmentSize(file.size)}).`
    );
  }

  const mimeType = resolveAttachmentMimeType(file);
  if (!mimeType) {
    throw new Error(
      `"${safeName}" has an unsupported format. Supported formats: Photos (JPG, PNG, WebP, HEIC) and Documents (PDF, TXT, CSV).`
    );
  }

  const hasValidSignature = await verifyFileSignature(file, mimeType);
  if (!hasValidSignature) {
    throw new Error(
      `"${safeName}" could not be verified as a valid ${mimeType.split('/')[1]?.toUpperCase() || 'supported'} file.`
    );
  }

  const [base64Data, previewDataUrl, textPreview] = await Promise.all([
    encodeFileToBase64(file),
    isImageMimeType(mimeType)
      ? createImagePreviewDataUrl(file)
      : Promise.resolve(undefined),
    mimeType.startsWith('text/')
      ? readTextFilePreview(file)
      : Promise.resolve(undefined),
  ]);

  const id = `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  try {
    const sessionBlobUrl = URL.createObjectURL(file);
    sessionAttachmentUrls.set(id, sessionBlobUrl);
  } catch {
    // Non-fatal if URL.createObjectURL is unavailable
  }

  const fileDataUrl =
    mimeType === 'application/pdf' && file.size <= MAX_INLINE_PDF_PERSIST_BYTES
      ? `data:application/pdf;base64,${base64Data}`
      : undefined;

  return {
    id,
    name: safeName,
    mimeType,
    size: file.size,
    source,
    file,
    base64Data,
    ...(previewDataUrl ? { previewDataUrl } : {}),
    ...(fileDataUrl ? { fileDataUrl } : {}),
    ...(textPreview ? { textPreview } : {}),
  };
};

export const stripAttachmentBase64 = (
  attachment: ChatAttachmentInput | ChatAttachmentMeta
): ChatAttachmentMeta => ({
  id: attachment.id,
  name: attachment.name,
  mimeType: attachment.mimeType,
  size: attachment.size,
  source: attachment.source,
  ...(attachment.url ? { url: attachment.url } : {}),
  ...(attachment.previewDataUrl
    ? { previewDataUrl: attachment.previewDataUrl }
    : {}),
  ...(attachment.fileDataUrl ? { fileDataUrl: attachment.fileDataUrl } : {}),
  ...(attachment.textPreview ? { textPreview: attachment.textPreview } : {}),
});
