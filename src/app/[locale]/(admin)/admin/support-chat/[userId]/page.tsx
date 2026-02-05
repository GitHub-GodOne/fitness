'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Send } from 'lucide-react';

import { cn } from '@/shared/lib/utils';

interface ChatMessage {
  id: string;
  content: string;
  type: 'user' | 'admin';
  createdAt: string;
}

export default function SupportChatDetailPage() {
  const { userId } = useParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchMessages = async () => {
    const res = await fetch(`/api/admin/support-chat/messages?userId=${userId}`);
    const data = await res.json();
    if (data.code === 0) setMessages(data.data);
  };

  useEffect(() => {
    fetchMessages();
    intervalRef.current = setInterval(fetchMessages, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    setIsLoading(true);
    const res = await fetch('/api/admin/support-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, content: inputValue.trim() }),
    });
    const data = await res.json();
    if (data.code === 0) {
      setMessages((prev) => [...prev, data.data]);
      setInputValue('');
    }
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-[calc(100vh-200px)] flex-col">
      <div className="flex-1 overflow-y-auto border rounded-lg p-4 bg-gray-50">
        <div className="space-y-3">
          {messages.length === 0 && <p className="text-center text-gray-400">No messages yet</p>}
          {messages.map((msg) => (
            <div key={msg.id} className={cn('flex', msg.type === 'admin' ? 'justify-end' : 'justify-start')}>
              <div className={cn('max-w-[70%] rounded-2xl px-4 py-2 text-sm', msg.type === 'admin' ? 'bg-[#b94d23] text-white' : 'bg-white shadow-sm border')}>
                {msg.content}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Type your reply..."
          disabled={isLoading}
          className="flex-1 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:border-[#b94d23]"
        />
        <button
          onClick={handleSend}
          disabled={!inputValue.trim() || isLoading}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#b94d23] text-white disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
