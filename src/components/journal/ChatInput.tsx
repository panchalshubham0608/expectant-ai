import { Loader2, Send } from 'lucide-react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}

function ChatInput({ value, onChange, onSend, disabled = false, isLoading = false }: ChatInputProps) {
  return (
    <div
      className="
fixed
bottom-16
left-0
right-0
bg-[#faf9f6]
p-4
"
    >
      <div
        className="
mx-auto
flex
max-w-md
gap-2
"
      >
        <input
          value={value}
          disabled={disabled || isLoading}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !disabled && !isLoading) onSend();
          }}
          placeholder={isLoading ? 'Assistant is typing...' : 'Tell me how today went...'}
          className="
flex-1
rounded-full
border
bg-white
px-4
py-3
outline-none
disabled:cursor-not-allowed
disabled:bg-gray-100
"
        />

        <button
          type="button"
          onClick={onSend}
          disabled={disabled || isLoading}
          className="
rounded-full
bg-green-700
p-3
text-white
transition
disabled:cursor-not-allowed
disabled:bg-gray-300
"
        >
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
}

export default ChatInput;
