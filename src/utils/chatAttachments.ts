import type { ChatAttachmentMeta, ChatAttachmentSource } from '../models/chat';
import {
  extractGoogleDriveFileId,
  getCachedDriveBlobUrl,
  getCachedDriveTextContent,
} from '../services/storage/googleDriveService';

export interface ChatAttachmentInput extends ChatAttachmentMeta {
  file: File;
  base64Data: string;
}

export const MAX_CHAT_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB per file
export const MAX_CHAT_ATTACHMENTS_COUNT = 5;

// In-memory Blob URLs for instant, zero-latency local preview during the active browser session
const sessionAttachmentUrls = new Map<string, string>();

export const getSessionAttachmentUrl = (id: string): string | undefined =>
  sessionAttachmentUrls.get(id);

export const getAttachmentPreviewUrl = (
  attachment?: ChatAttachmentMeta | null
): string | undefined => {
  if (!attachment) return undefined;
  return (
    sessionAttachmentUrls.get(attachment.id) ||
    getCachedDriveBlobUrl(attachment.url)
  );
};

export const getAttachmentPreviewText = (
  attachment?: ChatAttachmentMeta | null
): string | undefined => {
  if (!attachment) return undefined;
  return getCachedDriveTextContent(attachment.url);
};

export const getGoogleDriveEmbedUrl = (driveUrl?: string): string | null => {
  const fileId = extractGoogleDriveFileId(driveUrl);
  return fileId ? `https://drive.google.com/file/d/${fileId}/preview` : null;
};

export const getGoogleDriveThumbnailUrl = (
  driveUrl?: string,
  width = 800
): string | null => {
  const fileId = extractGoogleDriveFileId(driveUrl);
  return fileId
    ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w${width}`
    : null;
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

  const base64Data = await encodeFileToBase64(file);
  const id = `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  try {
    const sessionBlobUrl = URL.createObjectURL(file);
    sessionAttachmentUrls.set(id, sessionBlobUrl);
  } catch {
    // Non-fatal if URL.createObjectURL is unavailable
  }

  return {
    id,
    name: safeName,
    mimeType,
    size: file.size,
    source,
    file,
    base64Data,
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
});
