import { useEffect, useRef } from 'react';

export default function MessageList({ conversation, currentUser }) {
  const scroll = useRef(null);
  useEffect(() => {
    scroll.current?.scrollTo({ top: scroll.current.scrollHeight });
  }, [conversation]);
  return (
    <div ref={scroll} role="log" aria-label="Messages" className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
      {!conversation || conversation.messages.length === 0 ? (
        <div className="flex h-full items-center justify-center text-center text-slate-400">
          <p>{conversation ? 'No messages yet. Send the first message.' : 'Open a direct message to start chatting.'}</p>
        </div>
      ) : conversation.messages.map((message) => {
        const isMe = message.sender === currentUser;
        return (
          <div key={message.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
            <div className="mb-1 flex items-baseline gap-2 text-xs text-slate-400">
              <span>{message.sender}</span>
              <time dateTime={message.sentAt}>{new Date(message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
            </div>
            <p className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-sm ${isMe ? 'rounded-br-none bg-blue-600 text-white' : 'rounded-bl-none bg-slate-800 text-slate-200'}`}>
              {message.content}
            </p>
          </div>
        );
      })}
    </div>
  );
}
