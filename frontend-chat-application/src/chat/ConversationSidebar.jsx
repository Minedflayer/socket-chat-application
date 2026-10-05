export default function ConversationSidebar({ currentUser, chat, target, setTarget, width }) {
  async function submit(event) {
    event.preventDefault();
    if (await chat.openConversation(target)) setTarget('');
  }
  return (
    <aside style={{ '--sidebar-width': `${width}px` }} className="flex max-h-[40vh] shrink-0 flex-col bg-slate-900 sm:max-h-none sm:w-[var(--sidebar-width)] sm:max-w-[50vw]">
      <header className="p-4">
        <h1 className="text-lg font-bold">ChatApp</h1>
        <p className="mt-1 truncate text-sm text-slate-300">Signed in as {currentUser}</p>
        <p role="status" className="mt-1 text-xs text-slate-400">{chat.status}</p>
      </header>
      <div className="min-h-0 overflow-y-auto px-3 pb-4">
        <h2 className="mb-2 text-sm font-semibold">Direct messages</h2>
        <form onSubmit={submit} className="mb-3 flex gap-2">
          <label className="sr-only" htmlFor="dm-target">Recipient username</label>
          <input id="dm-target" value={target} onChange={(event) => setTarget(event.target.value)} placeholder="Username"
            className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500" />
          <button disabled={chat.status !== 'connected' || chat.opening || !target.trim()}
            className="rounded-md bg-emerald-600 px-3 text-sm text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50">
            {chat.opening ? 'Opening…' : 'Open'}
          </button>
        </form>
        {chat.conversations.size === 0 && <p className="text-sm text-slate-400">Open a conversation with another connected user.</p>}
        <ul className="space-y-1">
          {[...chat.conversations].map(([id, conversation]) => (
            <li key={id} className="flex gap-1">
              <button onClick={() => chat.setSelectedId(id)} aria-pressed={chat.selectedId === id}
                className={`min-w-0 flex-1 truncate rounded-md px-3 py-2 text-left text-sm ${chat.selectedId === id ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
                {conversation.peer}
              </button>
              <button onClick={() => chat.closeConversation(id)} disabled={chat.opening} aria-label={`Close conversation with ${conversation.peer}`}
                className="rounded-md px-2 text-slate-400 hover:text-rose-400 disabled:opacity-50">✕</button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
