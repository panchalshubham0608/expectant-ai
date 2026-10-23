import { useEffect, useRef } from 'react';
import { Loader2, Send } from 'lucide-react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}

function ChatInput({
  value,
  onChange,
  onSend,
  disabled = false,
  isLoading = false,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [value]);

  useEffect(() => {
    if (isLoading) {
      textareaRef.current?.blur();
    }
  }, [isLoading]);

  return (
    <div className="fixed bottom-16 left-0 right-0 z-20 border-t border-gray-200/50 bg-[#faf9f6]/95 px-4 py-3 backdrop-blur-sm">
      <div className="mx-auto flex max-w-md items-end gap-2">
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
            if (e.key === 'Enter' && !e.shiftKey && !disabled && !isLoading) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder="Ask anything or tell me how today went..."
          className="max-h-32 min-h-[46px] flex-1 resize-none overflow-y-auto rounded-3xl border border-gray-200 bg-white px-4 py-3 text-sm leading-relaxed text-gray-900 shadow-2xs outline-none transition placeholder:text-gray-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
        />

        <button
          type="button"
          onClick={onSend}
          disabled={disabled || isLoading}
          aria-label="Send message"
          className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white shadow-xs transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={17} />}
        </button>
      </div>
    </div>
  );
}

export default ChatInput;
