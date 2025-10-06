import React from 'react';

/**
 * En diagnostikpanel för chatten.
 * Visar livevärden som status, connId, antal meddelanden och senaste fel.
 * Kan döljas i produktion (styr via prop eller env).
 */
// diagnostics/DiagnosticsPanel.tsx (excerpt)
export default function DiagnosticsPanel({ connId, status, messageCount, latestError }) {
  return (
    <div className="fixed bottom-4 right-4 max-w-sm rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-xs">
      <div className="mb-1 font-mono">Conn: <span className="font-semibold">{connId}</span></div>
      <div>Status: {status}</div>
      <div>Messages: {messageCount}</div>
      {latestError && (
        <details className="mt-2">
          <summary className="cursor-pointer">Latest error</summary>
          <pre className="mt-1 overflow-auto whitespace-pre-wrap">
            {JSON.stringify(latestError, Object.getOwnPropertyNames(latestError), 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
