import {
  ArrowLeft,
  Camera,
  ExternalLink,
  FileText,
  HardDrive,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ChatAttachmentMeta } from '../../models/chat';
import {
  fetchDriveFilePreview,
  subscribeToDriveCacheUpdates,
} from '../../services/storage/googleDriveService';
import {
  formatAttachmentSize,
  getAttachmentPreviewText,
  getAttachmentPreviewUrl,
  getGoogleDriveEmbedUrl,
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
  const [, setDriveCacheTick] = useState(0);
  const [isFetchingDrive, setIsFetchingDrive] = useState(false);

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

  useEffect(() => {
    if (!attachment) return;

    const unsubscribe = subscribeToDriveCacheUpdates(() => {
      setDriveCacheTick((t) => t + 1);
    });

    if (attachment.url && !getAttachmentPreviewUrl(attachment)) {
      setIsFetchingDrive(true);
      void fetchDriveFilePreview(
        attachment.url,
        attachment.mimeType,
        false
      ).finally(() => {
        setIsFetchingDrive(false);
      });
    }

    return unsubscribe;
  }, [attachment]);

  if (!attachment) return null;

  const isImage = isImageMimeType(attachment.mimeType);
  const isPdf = attachment.mimeType === 'application/pdf';
  const isText = attachment.mimeType.startsWith('text/');

  const previewBlobUrl = getAttachmentPreviewUrl(attachment);
  const previewTextContent = getAttachmentPreviewText(attachment);
  const driveEmbedUrl = getGoogleDriveEmbedUrl(attachment.url);

  const imageSrc = isImage ? previewBlobUrl || null : null;
  const embedSrc = !isImage && !isText ? previewBlobUrl || driveEmbedUrl : null;

  const handleManualRefreshPreview = async () => {
    if (!attachment.url || isFetchingDrive) return;
    setIsFetchingDrive(true);
    try {
      await fetchDriveFilePreview(attachment.url, attachment.mimeType, true);
    } finally {
      setIsFetchingDrive(false);
    }
  };

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
          ) : isText && previewTextContent ? (
            <div className="h-full w-full overflow-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
              <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-gray-800">
                {previewTextContent}
              </pre>
            </div>
          ) : embedSrc ? (
            <iframe
              src={embedSrc}
              title={attachment.name}
              className="h-full w-full rounded-2xl border border-gray-200 bg-white shadow-2xs"
            />
          ) : isFetchingDrive ? (
            <div className="flex flex-col items-center gap-2.5 text-center">
              <Loader2 size={24} className="animate-spin text-emerald-700" />
              <p className="text-xs font-medium text-gray-600">
                Loading preview from Google Drive...
              </p>
            </div>
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
                  ? 'Refresh your Google Drive connection to load the preview directly, or open the file in Google Drive.'
                  : 'This file is being synced to your Google Drive folder (expectant-ai/mira-attachments).'}
              </p>
              {attachment.url && (
                <div className="mt-4 flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={handleManualRefreshPreview}
                    className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-800"
                  >
                    <RefreshCw size={13} />
                    <span>Load Preview from Drive</span>
                  </button>
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
                  >
                    <ExternalLink size={12} />
                    <span>Open in Google Drive</span>
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatAttachmentPreviewModal;
