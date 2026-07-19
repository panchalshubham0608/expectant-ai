import { useState } from 'react';

import ChatBubble from './ChatBubble';
import ChatInput from './ChatInput';

interface Message {
  id: number;

  role: 'user' | 'assistant';

  message: string;
}

const initialMessages: Message[] = [
  {
    id: 1,
    role: 'assistant',
    message: 'Good morning Shubham 🌱 How is Shailly feeling today?',
  },

  {
    id: 2,
    role: 'user',
    message: 'She felt slightly tired after waking up but nausea was less today.',
  },

  {
    id: 3,
    role: 'assistant',
    message: "That's good to hear. Please keep breakfast light and protein rich.",
  },

  {
    id: 4,
    role: 'user',
    message: 'She had milk and poha for breakfast.',
  },

  {
    id: 5,
    role: 'assistant',
    message: 'Noted. Breakfast looks good. Adding some fruit would improve it.',
  },
];

function ChatWindow() {
  const [messages, setMessages] = useState(initialMessages);

  const [input, setInput] = useState('');

  function sendMessage() {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now(),

      role: 'user',

      message: input,
    };

    setMessages((prev) => [...prev, userMessage]);

    setInput('');

    // Mock AI response

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,

        {
          id: Date.now(),

          role: 'assistant',

          message:
            "Got it. I have noted this. I'll consider this while suggesting tomorrow's meals.",
        },
      ]);
    }, 800);
  }

  return (
    <div
      className="
space-y-4
pb-24
"
    >
      <div>
        <h1
          className="
text-2xl
font-semibold
"
        >
          Daily Journal 🌱
        </h1>

        <p
          className="
text-sm
text-gray-500
"
        >
          Tell me about her day
        </p>
      </div>

      <div
        className="
space-y-4
"
      >
        {messages.map((message) => (
          <ChatBubble
            key={message.id}

            role={message.role}

            message={message.message}
          />
        ))}
      </div>

      <ChatInput
        value={input}

        onChange={setInput}

        onSend={sendMessage}
      />
    </div>
  );
}

export default ChatWindow;
