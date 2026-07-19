import { Send } from 'lucide-react';

interface ChatInputProps {
  value: string;

  onChange: (value: string) => void;

  onSend: () => void;
}

function ChatInput({ value, onChange, onSend }: ChatInputProps) {
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

          onChange={(e) => onChange(e.target.value)}

          onKeyDown={(e) => {
            if (e.key === 'Enter') onSend();
          }}

          placeholder="Tell me how today went..."

          className="
flex-1
rounded-full
border
bg-white
px-4
py-3
outline-none
"
        />

        <button
          onClick={onSend}

          className="
rounded-full
bg-green-700
p-3
text-white
"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}

export default ChatInput;
