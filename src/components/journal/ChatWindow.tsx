import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Bot, Loader2 } from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { getGeminiApiKey } from '../../services/profiles/profileService';
import {
  EMPTY_JOURNAL_EXTRACTION,
  generateJournalChatReply,
  saveJournalChatTurn,
  subscribeToJournalChats,
  type JournalMessageExtraction,
  upsertDailyLogFromExtraction,
} from '../../services/ai/journalChatService';
import type { ConversationMessage } from '../../models/chat';
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
    message: 'Good morning 🌱 How are you feeling today?',
  },
];

const emptyJournalExtractionState = {
  meals: [],
  hydration: [],
  symptoms: [],
  activities: [],
  medications: [],
  notes: [],
  other: [],
} as JournalMessageExtraction;

function ChatWindow() {
  const { id } = useParams();
  const { user } = useAuth();
  const { profile } = useProfile(user?.uid, id);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [knownExtraction, setKnownExtraction] = useState<JournalMessageExtraction>(() => ({
    meals: [],
    hydration: [],
    symptoms: [],
    activities: [],
    medications: [],
    notes: [],
    other: [],
  }));

  useEffect(() => {
    if (!user || !id) return;

    const unsubscribe = subscribeToJournalChats(user.uid, id, (records) => {
      const history = records
        .filter((record) => record.role === 'user' || record.role === 'assistant')
        .slice(-10)
        .map((record) => ({
          id: Number(String(record.id).replace(/\D/g, '')) || Date.now() + Math.random(),
          role: record.role as 'user' | 'assistant',
          message: record.content,
        }));

      if (history.length > 0) {
        setMessages(history);
      } else {
        setMessages(initialMessages);
      }
    });

    return unsubscribe;
  }, [user?.uid, id]);

  async function sendMessage() {
    if (!input.trim() || isSending) return;

    const content = input.trim();
    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      message: content,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsSending(true);

    try {
      const apiKey = user && id ? await getGeminiApiKey(user.uid, id).catch(() => undefined) : undefined;
      const chatHistory: ConversationMessage[] = messages.map((message) => ({
        id: String(message.id),
        role: message.role,
        content: message.message,
        timestamp: new Date().toISOString(),
        observationIds: [],
      }));

      const result = await generateJournalChatReply({
        message: content,
        profile: profile ?? null,
        history: chatHistory,
        knownState: knownExtraction,
        userApiKey: apiKey ?? undefined,
      });

      const assistantMessageId = `assistant-${Date.now()}`;
      const assistantMessage: Message = {
        id: Number(assistantMessageId.replace(/\D/g, '')),
        role: 'assistant',
        message: result.reply.answer,
      };

      setKnownExtraction(result.extracted);

      if (user && id) {
        await Promise.all([
          saveJournalChatTurn(
            user.uid,
            id,
            {
              id: String(userMessage.id),
              role: 'user',
              content,
              timestamp: new Date().toISOString(),
              observationIds: [],
            },
            result.extracted,
            result.reply,
          ),
          saveJournalChatTurn(
            user.uid,
            id,
            {
              id: assistantMessageId,
              role: 'assistant',
              content: result.reply.answer,
              timestamp: new Date().toISOString(),
              observationIds: [],
            },
            result.extracted,
            result.reply,
          ),
          upsertDailyLogFromExtraction(user.uid, id, result.extracted, {
            date: new Date().toISOString(),
            profile: profile ?? null,
          }),
        ]);
      }

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'I could not respond right now.';
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          role: 'assistant',
          message,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="space-y-4 pb-24">
      <div>
        <h1 className="text-2xl font-semibold">Daily Journal 🌱</h1>
        <p className="text-sm text-gray-500">Tell me about the day and I’ll keep the context going.</p>
      </div>

      <div className="space-y-4">
        {messages.map((message) => (
          <ChatBubble key={message.id} role={message.role} message={message.message} />
        ))}

        {isSending && (
          <div className="flex items-center gap-3 justify-start">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
              <Bot size={18} className="text-green-700" />
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 text-sm text-gray-500 shadow-sm">
              <span className="inline-flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Assistant is typing...
              </span>
            </div>
          </div>
        )}
      </div>

      <ChatInput
        value={input}
        onChange={setInput}
        onSend={sendMessage}
        disabled={!input.trim()}
        isLoading={isSending}
      />
    </div>
  );
}

export default ChatWindow;
