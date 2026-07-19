import { Bot, User } from 'lucide-react';

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  message: string;
}

function ChatBubble({ role, message }: ChatBubbleProps) {
  const isUser = role === 'user';

  return (
    <div
      className={`
        flex gap-3
        ${isUser ? 'justify-end' : 'justify-start'}
      `}
    >
      {!isUser && (
        <div
          className="
          flex
          h-8
          w-8
          items-center
          justify-center
          rounded-full
          bg-green-100
        "
        >
          <Bot size={18} />
        </div>
      )}

      <div
        className={`
          max-w-[80%]
          rounded-2xl
          px-4
          py-3
          text-sm

          ${isUser ? 'bg-green-700 text-white' : 'bg-white shadow-sm'}
        `}
      >
        {message}
      </div>

      {isUser && (
        <div
          className="
          flex
          h-8
          w-8
          items-center
          justify-center
          rounded-full
          bg-gray-200
        "
        >
          <User size={18} />
        </div>
      )}
    </div>
  );
}

export default ChatBubble;
