import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface PuzzlePlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  ariaLabel: string;
  scrollResetKey?: string;
  footer?: ReactNode;
  children: ReactNode;
}

export default function PuzzlePlayModal({
  isOpen,
  onClose,
  ariaLabel,
  scrollResetKey,
  footer,
  children,
}: PuzzlePlayModalProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [isOpen, scrollResetKey]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:rounded-3xl">
        {/* Sticky modal header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <span className="text-xs font-medium text-gray-400">
            Take your time — no timers, no rush
          </span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-200 hover:text-gray-900"
            aria-label="Close puzzle"
          >
            <X size={14} />
            <span>Close</span>
          </button>
        </div>

        {/* Scrollable puzzle content */}
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-5 pb-6">
          {children}
        </div>

        {/* Optional sticky footer (e.g. Next puzzle) */}
        {footer && (
          <div className="shrink-0 border-t border-gray-100 bg-gray-50/80 px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
