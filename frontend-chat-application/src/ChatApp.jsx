import { useEffect, useState } from 'react';
import { getCurrentUser } from './auth/AuthService';
import { useDirectMessages } from './chat/useDirectMessages';
import { MAX_MESSAGE_LENGTH } from './chat/dmClient';
import ConversationSidebar from './chat/ConversationSidebar';
import MessageList from './chat/MessageList';

export default function ChatApp() {
  const [currentUser] = useState(getCurrentUser);
  const chat = useDirectMessages(currentUser);
  const [target, setTarget] = useState('');
  const [drafts, setDrafts] = useState(new Map());
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [resizing, setResizing] = useState(false);
  const conversation = chat.conversations.get(chat.selectedId);
  const draft = drafts.get(chat.selectedId) ?? '';
  const canCompose = chat.status === 'connected' && !!conversation;

  useEffect(() => {
    if (!resizing) return;
    const move = (event) => setSidebarWidth(Math.max(200, Math.min(600, window.innerWidth / 2, event.clientX)));
    const stop = () => setResizing(false);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', stop);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', stop); };
  }, [resizing]);

  function updateDraft(value) {
    setDrafts((previous) => new Map(previous).set(chat.selectedId, value));
  }
  function submit(event) {
    event.preventDefault();
    if (chat.send(draft)) updateDraft('');
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-slate-950 text-slate-100 sm:flex-row">
      <ConversationSidebar currentUser={currentUser} chat={chat} target={target} setTarget={setTarget} width={sidebarWidth} />
      <div role="separator" aria-label="Resize conversation sidebar" aria-orientation="vertical"
        aria-valuemin={200} aria-valuemax={600} aria-valuenow={sidebarWidth} tabIndex={0}
        onMouseDown={() => setResizing(true)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            setSidebarWidth((width) => Math.max(200, Math.min(600, width + (event.key === 'ArrowRight' ? 20 : -20))));
          }
        }}
        className={`hidden w-1 shrink-0 cursor-col-resize hover:bg-blue-500 focus-visible:bg-blue-500 sm:block ${resizing ? 'bg-blue-500' : ''}`} />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center border-b border-slate-800 px-4 sm:px-6">
          <h2 className="truncate font-semibold">{conversation ? conversation.peer : 'Direct messages'}</h2>
        </header>
        <MessageList conversation={conversation} currentUser={currentUser} />
        <form onSubmit={submit} className="space-y-2 p-4">
          {chat.error && <p role="alert" className="text-sm text-rose-300">{chat.error}</p>}
          <label className="sr-only" htmlFor="dm-message">Message</label>
          <div className="flex items-end gap-2">
            <textarea id="dm-message" rows={2} maxLength={MAX_MESSAGE_LENGTH} disabled={!conversation} readOnly={!canCompose} value={draft}
              onChange={(event) => updateDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) submit(event);
              }}
              placeholder={conversation ? `Message ${conversation.peer}` : 'Select a conversation'}
              className="min-w-0 flex-1 resize-none rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm placeholder-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 disabled:opacity-50" />
            <button disabled={!canCompose || !draft.trim()} className="rounded-md bg-blue-600 px-4 py-3 text-sm text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">Send</button>
          </div>
          <p className="text-right text-xs text-slate-400">{draft.length}/{MAX_MESSAGE_LENGTH} · Enter to send · Shift + Enter for a new line</p>
        </form>
      </main>
    </div>
  );
}
