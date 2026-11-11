import { useEffect, useRef, useState } from 'react';
import {
  Camera,
  FileText,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  Plus,
  Send,
  X,
} from 'lucide-react';
import type { ChatAttachmentSource } from '../../models/chat';
import {
  type ChatAttachmentInput,
  formatAttachmentSize,
  getSessionAttachmentUrl,
  isImageMimeType,
  MAX_CHAT_ATTACHMENTS_COUNT,
  prepareChatAttachment,
} from '../../utils/chatAttachments';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  attachments: ChatAttachmentInput[];
  onAttachmentsChange: (attachments: ChatAttachmentInput[]) => void;
  onSend: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}

const isMobileUserAgent = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
};

function ChatInput({
  value,
  onChange,
  attachments,
  onAttachmentsChange,
  onSend,
  disabled = false,
  isLoading = false,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const maxHeight = 128;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [value]);

  useEffect(() => {
    if (isLoading) {
      textareaRef.current?.blur();
    }
  }, [isLoading]);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const processSelectedFiles = async (
    fileList: File[],
    source: ChatAttachmentSource
  ) => {
    if (fileList.length === 0) return;

    setAttachmentError(null);
    const remainingSlots = MAX_CHAT_ATTACHMENTS_COUNT - attachments.length;
    if (remainingSlots <= 0) {
      setAttachmentError(
        `You can attach up to ${MAX_CHAT_ATTACHMENTS_COUNT} files per message.`
      );
      return;
    }

    const filesToProcess = fileList.slice(0, remainingSlots);
    if (fileList.length > remainingSlots) {
      setAttachmentError(
        `Only the first ${remainingSlots} file(s) were added (max ${MAX_CHAT_ATTACHMENTS_COUNT} per message).`
      );
    }

    setIsProcessingFiles(true);
    try {
      const prepared: ChatAttachmentInput[] = [];
      for (const file of filesToProcess) {
        const item = await prepareChatAttachment(file, source);
        prepared.push(item);
      }
      if (prepared.length > 0) {
        onAttachmentsChange([...attachments, ...prepared]);
      }
    } catch (error) {
      setAttachmentError(
        error instanceof Error
          ? error.message
          : 'Could not attach the selected file. Please try another file.'
      );
    } finally {
      setIsProcessingFiles(false);
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
    source: ChatAttachmentSource
  ) => {
    const selected = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = '';
    await processSelectedFiles(selected, source);
  };

  const handleRemoveAttachment = (id: string) => {
    onAttachmentsChange(attachments.filter((item) => item.id !== id));
    setAttachmentError(null);
  };

  const handleCameraOptionClick = async () => {
    setIsMenuOpen(false);
    setAttachmentError(null);

    if (
      isMobileUserAgent() ||
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      cameraInputRef.current?.click();
      return;
    }

    setCameraError(null);
    setIsCameraModalOpen(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraError(
        'Camera access is unavailable or blocked. You can still choose a photo from your device below.'
      );
    }
  };

  const closeCameraModal = () => {
    stopCameraStream();
    setIsCameraModalOpen(false);
    setCameraError(null);
  };

  const handleCapturePhotoFromModal = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.9)
    );
    if (!blob) return;

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, 19);
    const capturedFile = new File([blob], `camera-${timestamp}.jpg`, {
      type: 'image/jpeg',
    });

    closeCameraModal();
    await processSelectedFiles([capturedFile], 'camera');
  };

  const handleGalleryOptionClick = () => {
    setIsMenuOpen(false);
    setAttachmentError(null);
    galleryInputRef.current?.click();
  };

  const handleDocumentOptionClick = () => {
    setIsMenuOpen(false);
    setAttachmentError(null);
    documentInputRef.current?.click();
  };

  return (
    <>
      <div className="fixed bottom-16 left-0 right-0 z-20 border-t border-gray-200/50 bg-[#faf9f6]/95 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto max-w-md space-y-2.5">
          {/* Validation / Size Error Banner */}
          {attachmentError && (
            <div className="flex items-start justify-between gap-2 rounded-2xl border border-red-200 bg-red-50/95 px-3.5 py-2 text-xs text-red-700 shadow-2xs">
              <span className="leading-relaxed">{attachmentError}</span>
              <button
                type="button"
                onClick={() => setAttachmentError(null)}
                aria-label="Dismiss attachment error"
                className="shrink-0 rounded-full p-0.5 text-red-500 transition hover:bg-red-100 hover:text-red-700"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Selected Attachments Preview Bar */}
          {(attachments.length > 0 || isProcessingFiles) && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5">
              {attachments.map((att) => {
                const isImage = isImageMimeType(att.mimeType);
                const thumbSrc = isImage
                  ? getSessionAttachmentUrl(att.id)
                  : undefined;
                const extLabel =
                  att.mimeType === 'application/pdf'
                    ? 'PDF'
                    : att.name.split('.').pop()?.toUpperCase() || 'FILE';

                return (
                  <div
                    key={att.id}
                    className="group relative flex max-w-[210px] shrink-0 items-center gap-2.5 rounded-2xl border border-emerald-200/90 bg-white p-2 pr-7 shadow-2xs"
                  >
                    {isImage && thumbSrc ? (
                      <img
                        src={thumbSrc}
                        alt={att.name}
                        className="h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-emerald-100"
                      />
                    ) : (
                      <div
                        className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl text-[10px] font-bold ring-1 ${
                          isImage
                            ? 'bg-purple-50 text-purple-700 ring-purple-200/60'
                            : 'bg-teal-50 text-teal-700 ring-teal-200/60'
                        }`}
                      >
                        {isImage ? (
                          <ImageIcon size={16} />
                        ) : (
                          <>
                            <FileText size={14} />
                            <span className="mt-0.5 text-[8px] leading-none">
                              {extLabel.slice(0, 4)}
                            </span>
                          </>
                        )}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-gray-800">
                        {att.name}
                      </p>
                      <p className="truncate text-[10px] font-medium text-gray-400">
                        {att.source === 'camera'
                          ? 'Camera'
                          : att.source === 'gallery'
                            ? 'Gallery'
                            : extLabel}{' '}
                        • {formatAttachmentSize(att.size)}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleRemoveAttachment(att.id)}
                      aria-label={`Remove ${att.name}`}
                      className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-red-100 hover:text-red-600 disabled:opacity-50"
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })}

              {isProcessingFiles && (
                <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-emerald-200/80 bg-white px-3 py-2.5 text-xs font-medium text-emerald-700 shadow-2xs">
                  <Loader2 size={15} className="animate-spin" />
                  <span>Attaching...</span>
                </div>
              )}
            </div>
          )}

          {/* Hidden File Inputs for Camera, Gallery, and Documents */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleFileChange(e, 'camera')}
            className="hidden"
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFileChange(e, 'gallery')}
            className="hidden"
          />
          <input
            ref={documentInputRef}
            type="file"
            accept=".pdf,application/pdf,.txt,text/plain,.csv,text/csv,.md,text/markdown"
            multiple
            onChange={(e) => handleFileChange(e, 'document')}
            className="hidden"
          />

          {/* Input Row: Add Attachment Menu Button + Textarea + Send Button */}
          <div className="flex items-end gap-2">
            <div ref={menuContainerRef} className="relative shrink-0">
              {isMenuOpen && (
                <div
                  role="menu"
                  aria-label="Add attachment options"
                  className="absolute bottom-full left-0 mb-2.5 w-56 overflow-hidden rounded-2xl border border-emerald-100 bg-white p-1.5 shadow-xl ring-1 ring-black/5"
                >
                  <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Share with MIRA
                  </div>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleCameraOptionClick}
                    className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-emerald-50/80"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-200/60">
                      <Camera size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-900">Camera</p>
                      <p className="truncate text-[11px] text-gray-500">
                        Take a photo now
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleGalleryOptionClick}
                    className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-emerald-50/80"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 ring-1 ring-purple-200/60">
                      <ImageIcon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-900">Gallery</p>
                      <p className="truncate text-[11px] text-gray-500">
                        Choose photos or scans
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleDocumentOptionClick}
                    className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-emerald-50/80"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600 ring-1 ring-teal-200/60">
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-900">
                        Documents
                      </p>
                      <p className="truncate text-[11px] text-gray-500">
                        PDF reports, TXT, CSV
                      </p>
                    </div>
                  </button>
                </div>
              )}

              <button
                type="button"
                disabled={isLoading || isProcessingFiles}
                onClick={() => setIsMenuOpen((prev) => !prev)}
                aria-label="Add file attachment"
                aria-expanded={isMenuOpen}
                className={`flex h-[46px] w-[46px] items-center justify-center rounded-full border transition ${
                  isMenuOpen
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-xs'
                    : attachments.length > 0
                      ? 'border-emerald-300 bg-emerald-50/70 text-emerald-700 hover:bg-emerald-100/70'
                      : 'border-gray-200 bg-white text-gray-600 shadow-2xs hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-emerald-700'
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {attachments.length > 0 && !isMenuOpen ? (
                  <Paperclip size={18} />
                ) : (
                  <Plus
                    size={20}
                    className={`transition-transform duration-200 ${
                      isMenuOpen ? 'rotate-45' : ''
                    }`}
                  />
                )}
              </button>
            </div>

            <textarea
              ref={textareaRef}
              rows={1}
              value={value}
              disabled={isLoading}
              readOnly={isLoading}
              onChange={(e) => {
                if (!isLoading) onChange(e.target.value);
              }}
              onKeyDown={(e) => {
                if (
                  e.key === 'Enter' &&
                  !e.shiftKey &&
                  !disabled &&
                  !isLoading &&
                  !isProcessingFiles
                ) {
                  e.preventDefault();
                  setIsMenuOpen(false);
                  onSend();
                }
              }}
              placeholder="Ask anything"
              className="max-h-32 min-h-[46px] flex-1 resize-none overflow-y-hidden rounded-3xl border border-gray-200 bg-white px-4 py-3 text-sm leading-relaxed text-gray-900 shadow-2xs outline-none transition placeholder:text-gray-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
            />

            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                onSend();
              }}
              disabled={disabled || isLoading || isProcessingFiles}
              aria-label="Send message"
              className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white shadow-xs transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={17} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop / Browser Camera Capture Modal */}
      {isCameraModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          onClick={closeCameraModal}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-5 shadow-2xl ring-1 ring-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <Camera size={17} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Take a Photo
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Capture a meal, report, or prescription for MIRA
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeCameraModal}
                aria-label="Close camera"
                className="rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            {cameraError ? (
              <div className="mt-4 space-y-3 rounded-2xl bg-amber-50/80 p-4 text-center ring-1 ring-amber-200/70">
                <p className="text-xs leading-relaxed text-amber-900">
                  {cameraError}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    closeCameraModal();
                    cameraInputRef.current?.click();
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-800"
                >
                  <ImageIcon size={14} />
                  <span>Choose Photo from Device</span>
                </button>
              </div>
            ) : (
              <div className="mt-4 overflow-hidden rounded-2xl bg-slate-900 ring-1 ring-gray-200">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="aspect-4/3 w-full object-cover"
                />
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  closeCameraModal();
                  cameraInputRef.current?.click();
                }}
                className="rounded-full px-3.5 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
              >
                Use file picker instead
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeCameraModal}
                  className="rounded-full px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
                >
                  Cancel
                </button>
                {!cameraError && (
                  <button
                    type="button"
                    onClick={handleCapturePhotoFromModal}
                    className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-800"
                  >
                    <Camera size={14} />
                    <span>Capture Photo</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ChatInput;
