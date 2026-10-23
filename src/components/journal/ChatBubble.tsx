import { AlertCircle, Bot, RotateCcw, Sparkles, User } from 'lucide-react';
import type { ReactNode } from 'react';

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  message: string;
  followUpQuestion?: string;
  timestamp?: string;
  isError?: boolean;
  onRetry?: () => void;
}

const renderInlineBold = (text: string): ReactNode[] => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
};

const renderFormattedMessage = (content: string): ReactNode => {
  const lines = content.split('\n');
  const blocks: ReactNode[] = [];
  let currentList: string[] = [];

  const flushList = (keyPrefix: string) => {
    if (currentList.length === 0) return;
    blocks.push(
      <ul key={`list-${keyPrefix}`} className="my-1.5 list-disc space-y-1 pl-4">
        {currentList.map((item, i) => (
          <li key={i} className="leading-relaxed">
            {renderInlineBold(item)}
          </li>
        ))}
      </ul>
    );
    currentList = [];
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) {
      flushList(String(index));
      return;
    }

    if (/^[-*•]\s+/.test(line)) {
      currentList.push(line.replace(/^[-*•]\s+/, ''));
    } else {
      flushList(String(index));
      blocks.push(
        <p key={`p-${index}`} className="leading-relaxed">
          {renderInlineBold(line)}
        </p>
      );
    }
  });

  flushList('end');

  return <div className="space-y-2">{blocks}</div>;
};

const formatTime = (iso?: string) => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

function ChatBubble({
  role,
  message,
  followUpQuestion,
  timestamp,
  isError = false,
  onRetry,
}: ChatBubbleProps) {
  const isUser = role === 'user';
  const timeLabel = formatTime(timestamp);
  const showFollowUp =
    !isUser &&
    !isError &&
    followUpQuestion &&
    followUpQuestion.trim() &&
    !message.includes(followUpQuestion.trim());

  return (
    <div className={`flex items-end gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-xs ${
            isError
              ? 'bg-red-100 text-red-600'
              : 'bg-emerald-100 text-emerald-700'
          }`}
        >
          {isError ? <AlertCircle size={16} /> : <Bot size={17} />}
        </div>
      )}

      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
          isUser
            ? 'rounded-br-sm bg-emerald-700 text-white shadow-xs'
            : isError
              ? 'rounded-bl-sm bg-red-50 text-red-800 ring-1 ring-red-200/80'
              : 'rounded-bl-sm bg-white text-gray-800 shadow-xs ring-1 ring-gray-100'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap leading-relaxed">{message}</p>
        ) : (
          renderFormattedMessage(message)
        )}

        {showFollowUp && (
          <div className="mt-2.5 flex items-start gap-1.5 border-t border-emerald-100 pt-2 text-xs font-medium text-emerald-800">
            <Sparkles size={13} className="mt-0.5 shrink-0 text-emerald-600" />
            <span>{followUpQuestion}</span>
          </div>
        )}

        {isError && onRetry && (
          <div className="mt-2.5 border-t border-red-200/70 pt-2">
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-red-700 shadow-2xs ring-1 ring-red-200 transition hover:bg-red-100/60"
            >
              <RotateCcw size={12} />
              <span>Try again</span>
            </button>
          </div>
        )}

        {timeLabel && (
          <div
            className={`mt-1 text-right text-[10px] ${
              isUser
                ? 'text-emerald-100/80'
                : isError
                  ? 'text-red-400'
                  : 'text-gray-400'
            }`}
          >
            {timeLabel}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-700">
          <User size={17} />
        </div>
      )}
    </div>
  );
}

export default ChatBubble;
