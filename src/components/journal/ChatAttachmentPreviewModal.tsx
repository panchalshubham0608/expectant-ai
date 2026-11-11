import {
  ArrowLeft,
  Camera,
  ExternalLink,
  FileText,
  HardDrive,
  Image as ImageIcon,
} from 'lucide-react';
import { useEffect } from 'react';
import type { ChatAttachmentMeta } from '../../models/chat';
import {
  formatAttachmentSize,
  getGoogleDriveEmbedUrl,
  getGoogleDriveThumbnailUrl,
  getSessionAttachmentUrl,
  isImageMimeType,
} from '../../utils/chatAttachments';

interface ChatAttachmentPreviewModalProps {
  attachment: ChatAttachmentMeta | null;
  onClose: () => void;
}

function ChatAttachmentPreviewModal({
  attachment,
  onClose,
}: ChatAttachmentPreviewModalProps) {
  useEffect(() => {
    if (!attachment) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [attachment, onClose]);

  if (!attachment) return null;

  const isImage = isImageMimeType(attachment.mimeType);
  const isPdf = attachment.mimeType === 'application/pdf';

  const sessionBlobUrl = getSessionAttachmentUrl(attachment.id);
  const driveEmbedUrl = getGoogleDriveEmbedUrl(attachment.url);
  const driveThumbnailUrl = isImage
    ? getGoogleDriveThumbnailUrl(attachment.url, 1200)
    : null;

  const imageSrc = isImage
    ? sessionBlobUrl || driveThumbnailUrl || null
    : null;

  const embedSrc = sessionBlobUrl || driveEmbedUrl;

  const sourceLabel =
    attachment.source === 'camera'
      ? 'Camera Photo'
      : attachment.source === 'gallery'
        ? 'Gallery Photo'
        : isPdf
          ? 'PDF Document'
          : 'Document';

  return (
    <div
      className="fixed inset-0 z-50 bg-[#faf9f6] text-gray-900"
      role="region"
      aria-label={`Preview ${attachment.name}`}
    >
      <div className="mx-auto flex h-full w-full max-w-md flex-col bg-[#faf9f6]">
        {/* Full-Page Top Bar */}
        <div className="border-b border-emerald-100/80 bg-white/95 px-4 py-3 shadow-2xs backdrop-blur-md">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                aria-label="Back"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50/80 text-emerald-800 ring-1 ring-emerald-200/70 transition hover:bg-emerald-100"
              >
                <ArrowLeft size={18} />
              </button>

              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold text-gray-900">
                  {attachment.name}
                </h3>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    {attachment.source === 'camera' ? (
                      <Camera size={11} className="text-emerald-700" />
                    ) : isImage ? (
                      <ImageIcon size={11} className="text-emerald-700" />
                    ) : (
                      <FileText size={11} className="text-emerald-700" />
                    )}
                    <span>{sourceLabel}</span>
                  </span>
                  <span>•</span>
                  <span>{formatAttachmentSize(attachment.size)}</span>
                  {attachment.url && (
                    <>
                      <span>•</span>
                      <span className="inline-flex items-center gap-0.5 font-medium text-emerald-700">
                        <HardDrive size={10} />
                        <span>Drive</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {attachment.url && (
              <a
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in Google Drive"
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200/80 transition hover:bg-emerald-100"
              >
                <ExternalLink size={12} />
                <span>Drive</span>
              </a>
            )}
          </div>
        </div>

        {/* Full-Page Preview Body */}
        <div className="flex flex-1 items-center justify-center overflow-auto p-4 pb-24">
          {isImage && imageSrc ? (
            <img
              src={imageSrc}
              alt={attachment.name}
              className="max-h-full w-auto max-w-full rounded-2xl object-contain shadow-sm ring-1 ring-gray-200/70"
            />
          ) : embedSrc ? (
            <iframe
              src={embedSrc}
              title={attachment.name}
              className="h-full w-full rounded-2xl border border-gray-200 bg-white shadow-2xs"
            />
          ) : (
            <div className="flex max-w-xs flex-col items-center rounded-3xl border border-gray-200/80 bg-white p-6 text-center shadow-2xs">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70">
                {isImage ? <ImageIcon size={24} /> : <FileText size={24} />}
              </div>
              <p className="text-sm font-bold text-gray-900">
                {attachment.name}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">
                {attachment.url
                  ? 'Open this file directly in your Google Drive folder (expectant-ai/mira-attachments).'
                  : 'This file is being synced to your Google Drive folder (expectant-ai/mira-attachments).'}
              </p>
              {attachment.url && (
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-800"
                >
                  <ExternalLink size={13} />
                  <span>Open in Google Drive</span>
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatAttachmentPreviewModal;
