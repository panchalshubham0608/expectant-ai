import {
  ArrowLeft,
  Camera,
  ExternalLink,
  Eye,
  FileText,
  FolderOpen,
  HardDrive,
  Image as ImageIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ChatAttachmentMeta } from '../../models/chat';
import { MIRA_CHAT_DRIVE_SUBFOLDER } from '../../services/storage/googleDriveService';
import {
  formatAttachmentSize,
  getSessionAttachmentUrl,
  isImageMimeType,
} from '../../utils/chatAttachments';

export interface ChatMediaGalleryItem extends ChatAttachmentMeta {
  timestamp?: string;
}

interface ChatMediaGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachments: ChatMediaGalleryItem[];
  onSelectAttachment: (attachment: ChatAttachmentMeta) => void;
}

type MediaFilterTab = 'all' | 'photos' | 'documents';

const formatSharedDate = (iso?: string): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

function ChatMediaGalleryModal({
  isOpen,
  onClose,
  attachments,
  onSelectAttachment,
}: ChatMediaGalleryModalProps) {
  const [activeTab, setActiveTab] = useState<MediaFilterTab>('all');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const { photos, documents } = useMemo(() => {
    const photoList: ChatMediaGalleryItem[] = [];
    const docList: ChatMediaGalleryItem[] = [];
    for (const item of attachments) {
      if (isImageMimeType(item.mimeType)) {
        photoList.push(item);
      } else {
        docList.push(item);
      }
    }
    return { photos: photoList, documents: docList };
  }, [attachments]);

  if (!isOpen) return null;

  const showPhotosSection =
    (activeTab === 'all' || activeTab === 'photos') && photos.length > 0;
  const showDocumentsSection =
    (activeTab === 'all' || activeTab === 'documents') && documents.length > 0;
  const isEmpty =
    (activeTab === 'all' && attachments.length === 0) ||
    (activeTab === 'photos' && photos.length === 0) ||
    (activeTab === 'documents' && documents.length === 0);

  return (
    <div
      className="fixed inset-0 z-40 bg-[#faf9f6] text-gray-900"
      role="region"
      aria-label="MIRA Shared Media and Documents"
    >
      <div className="mx-auto flex h-full w-full max-w-md flex-col bg-[#faf9f6]">
        {/* Full-Page Sticky Top Bar (matches MIRA chat top bar) */}
        <div className="border-b border-emerald-100/80 bg-white/95 px-4 py-3 shadow-2xs backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                aria-label="Back to MIRA chat"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50/80 text-emerald-800 ring-1 ring-emerald-200/70 transition hover:bg-emerald-100"
              >
                <ArrowLeft size={18} />
              </button>

              <div className="min-w-0">
                <h2 className="truncate text-sm font-bold tracking-wide text-gray-900">
                  Shared Media & Docs
                </h2>
                <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] font-medium text-emerald-700">
                  <HardDrive size={11} className="shrink-0" />
                  <span className="truncate">
                    expectant-ai/{MIRA_CHAT_DRIVE_SUBFOLDER}
                  </span>
                </p>
              </div>
            </div>

            <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-200/70">
              {attachments.length} {attachments.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          {/* Segmented Social-Media-Style Tabs */}
          <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-2xl bg-gray-100/90 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`rounded-xl py-1.5 text-xs font-semibold transition ${
                activeTab === 'all'
                  ? 'bg-white text-emerald-800 shadow-2xs ring-1 ring-gray-200/60'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All ({attachments.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('photos')}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-semibold transition ${
                activeTab === 'photos'
                  ? 'bg-white text-emerald-800 shadow-2xs ring-1 ring-gray-200/60'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ImageIcon size={13} />
              <span>Photos ({photos.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('documents')}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-semibold transition ${
                activeTab === 'documents'
                  ? 'bg-white text-emerald-800 shadow-2xs ring-1 ring-gray-200/60'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText size={13} />
              <span>Docs ({documents.length})</span>
            </button>
          </div>
        </div>

        {/* Full-Page Scrollable Content */}
        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4 pb-28">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-white/70 px-6 py-14 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                <FolderOpen size={22} />
              </div>
              <p className="text-sm font-bold text-gray-800">
                No {activeTab === 'all' ? 'media or documents' : activeTab} shared yet
              </p>
              <p className="mt-1 max-w-xs text-xs leading-relaxed text-gray-500">
                Photos and documents you share with MIRA appear here and are
                backed up to{' '}
                <span className="font-mono text-[11px] font-semibold text-emerald-700">
                  expectant-ai/{MIRA_CHAT_DRIVE_SUBFOLDER}
                </span>{' '}
                in your Google Drive.
              </p>
            </div>
          ) : (
            <>
              {/* Photos Grid Section (Instagram / WhatsApp Media style) */}
              {showPhotosSection && (
                <section className="space-y-2.5">
                  {activeTab === 'all' && documents.length > 0 && (
                    <div className="flex items-center justify-between px-0.5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                        Photos ({photos.length})
                      </h3>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((item) => {
                      const thumbSrc =
                        getSessionAttachmentUrl(item.id) || item.previewDataUrl;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onSelectAttachment(item)}
                          className="group relative aspect-square w-full overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-2xs transition hover:border-emerald-400"
                        >
                          {thumbSrc ? (
                            <img
                              src={thumbSrc}
                              alt={item.name}
                              className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-emerald-50/60 p-2 text-emerald-700">
                              <ImageIcon size={20} />
                              <span className="w-full truncate text-center text-[10px] font-medium">
                                {item.name}
                              </span>
                            </div>
                          )}

                          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/65 via-black/25 to-transparent px-2 py-1.5 text-white">
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium">
                              {item.source === 'camera' ? (
                                <Camera size={10} />
                              ) : (
                                <ImageIcon size={10} />
                              )}
                            </span>
                            {item.url && (
                              <span
                                title="Saved in Google Drive"
                                className="inline-flex items-center"
                              >
                                <HardDrive size={10} />
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Documents List Section */}
              {showDocumentsSection && (
                <section className="space-y-2.5">
                  {activeTab === 'all' && photos.length > 0 && (
                    <div className="flex items-center justify-between px-0.5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                        Documents ({documents.length})
                      </h3>
                    </div>
                  )}

                  <div className="space-y-2.5">
                    {documents.map((item) => {
                      const dateLabel = formatSharedDate(item.timestamp);

                      return (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-gray-200/90 bg-white p-3 shadow-2xs transition hover:border-emerald-300"
                        >
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              onClick={() => onSelectAttachment(item)}
                              className="flex min-w-0 flex-1 items-start gap-3 text-left"
                            >
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70">
                                <FileText size={18} />
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-bold text-gray-900">
                                  {item.name}
                                </p>
                                <p className="mt-0.5 text-[11px] text-gray-500">
                                  {item.mimeType === 'application/pdf'
                                    ? 'PDF Document'
                                    : 'Text Document'}{' '}
                                  • {formatAttachmentSize(item.size)}
                                  {dateLabel ? ` • ${dateLabel}` : ''}
                                </p>
                                {item.textPreview && (
                                  <p className="mt-1.5 line-clamp-2 rounded-xl bg-gray-50 px-2.5 py-1.5 font-mono text-[10px] text-gray-600 ring-1 ring-gray-200/60">
                                    {item.textPreview}
                                  </p>
                                )}
                              </div>
                            </button>

                            <div className="flex shrink-0 items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onSelectAttachment(item)}
                                className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-200/70 transition hover:bg-emerald-100"
                              >
                                <Eye size={11} />
                                <span>Preview</span>
                              </button>
                              {item.url && (
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Open in Google Drive"
                                  aria-label={`Open ${item.name} in Google Drive`}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition hover:bg-emerald-50 hover:text-emerald-700"
                                >
                                  <ExternalLink size={12} />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatMediaGalleryModal;
