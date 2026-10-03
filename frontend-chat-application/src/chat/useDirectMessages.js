import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getToken } from '../auth/AuthService';
import { createLogger } from '../logging/logger';
import { createStompLogger } from '../logging/stomplogger';
import { mergeMessages, publishMessage, requestOpen } from './dmClient';

export function useDirectMessages(currentUser) {
  const [status, setStatus] = useState('connecting');
  const [error, setError] = useState('');
  const [opening, setOpening] = useState(false);
  const [conversations, setConversations] = useState(new Map());
  const [selectedId, setSelectedId] = useState(null);
  const [log] = useState(() => createLogger('DM'));
  const clientRef = useRef(null);
  const subscriptions = useRef(new Map());
  const pendingOpen = useRef(null);
  const historyAbort = useRef(null);
  const openingRef = useRef(false);

  useEffect(() => {
    const activeSubscriptions = subscriptions.current;
    const client = new Client({
      webSocketFactory: () => new SockJS('/chat'),
      // Subscription recovery is a later milestone. Reload explicitly to reconnect.
      reconnectDelay: 0,
      connectHeaders: { Authorization: `Bearer ${getToken()}` },
      onConnect: () => {
        if (clientRef.current === client) { setStatus('connected'); setError(''); }
      },
      onStompError: () => {
        if (clientRef.current === client) setError('The server rejected the connection. Reload to sign in again.');
      },
      onWebSocketClose: () => {
        if (clientRef.current !== client) return;
        setStatus('disconnected');
        setError('Connection lost. Copy any draft before reloading to reconnect.');
        pendingOpen.current?.cancel();
        historyAbort.current?.abort();
        activeSubscriptions.clear();
      },
    });
    createStompLogger(client, log);
    clientRef.current = client;
    client.activate();
    return () => {
      clientRef.current = null;
      pendingOpen.current?.cancel();
      historyAbort.current?.abort();
      activeSubscriptions.clear();
      void client.deactivate();
    };
  }, [log]);

  async function openConversation(rawUsername) {
    const client = clientRef.current;
    const username = rawUsername.trim();
    if (openingRef.current) return false;
    setError('');
    if (!client?.connected) { setError('Connect to chat before opening a conversation.'); return false; }
    if (!username || username === currentUser) { setError('Enter another user’s username.'); return false; }
    if (/[/#?]/.test(username)) { setError('Usernames containing /, # or ? cannot be used as DM destinations.'); return false; }
    const existing = [...conversations].find(([, conversation]) => conversation.peer === username);
    if (existing) { setSelectedId(existing[0]); return true; }

    openingRef.current = true;
    setOpening(true);
    let id;
    let subscription;
    const controller = new AbortController();
    historyAbort.current = controller;
    try {
      pendingOpen.current = requestOpen(client, username);
      const reply = await pendingOpen.current.promise;
      pendingOpen.current = null;
      if (!client.connected || clientRef.current !== client) throw new Error('Connection lost while opening.');
      id = reply.conversationId;
      setConversations((previous) => new Map(previous).set(id, { peer: username, messages: [] }));
      // Subscribe before fetching history so messages arriving during the fetch are retained.
      subscription = client.subscribe(`/user/queue/dm/${id}`, (frame) => {
        try {
          const message = JSON.parse(frame.body);
          setConversations((previous) => {
            const conversation = previous.get(id);
            if (!conversation || subscriptions.current.get(id) !== subscription) return previous;
            return new Map(previous).set(id, { ...conversation, messages: mergeMessages(conversation.messages, [message]) });
          });
        } catch {
          setError('A message could not be read. Reopen the conversation to load its history.');
        }
      });
      subscriptions.current.set(id, subscription);
      const response = await fetch(`/api/dm/${id}/messages?limit=50`, {
        headers: { Authorization: `Bearer ${getToken()}` }, signal: controller.signal,
      });
      if (!response.ok) throw new Error('Could not load message history. Try opening the conversation again.');
      const history = await response.json();
      if (!Array.isArray(history)) throw new Error('Invalid message history response.');
      if (controller.signal.aborted || clientRef.current !== client) throw new Error('Connection lost while loading history.');
      setConversations((previous) => {
        const conversation = previous.get(id);
        return conversation ? new Map(previous).set(id, { ...conversation, messages: mergeMessages(history, conversation.messages) }) : previous;
      });
      setSelectedId(id);
      return true;
    } catch (failure) {
      if (client.connected) subscription?.unsubscribe();
      if (id != null) {
        subscriptions.current.delete(id);
        setConversations((previous) => { const next = new Map(previous); next.delete(id); return next; });
      }
      if (clientRef.current === client) setError(failure.message || 'Could not open the conversation.');
      return false;
    } finally {
      pendingOpen.current = null;
      historyAbort.current = null;
      openingRef.current = false;
      if (clientRef.current === client) setOpening(false);
    }
  }

  function closeConversation(id) {
    if (openingRef.current) return;
    if (clientRef.current?.connected) subscriptions.current.get(id)?.unsubscribe();
    subscriptions.current.delete(id);
    setConversations((previous) => { const next = new Map(previous); next.delete(id); return next; });
    if (selectedId === id) setSelectedId(null);
  }

  function send(draft) {
    try {
      if (!subscriptions.current.has(selectedId)) throw new Error('Open a connected conversation before sending. Your draft has been kept.');
      publishMessage(clientRef.current, conversations.get(selectedId)?.peer, draft);
      setError('');
      return true;
    } catch (failure) {
      const message = failure.message || 'Could not send the message.';
      setError(message.includes('Your draft has been kept.') ? message : `${message} Your draft has been kept.`);
      return false;
    }
  }

  return { status, error, opening, conversations, selectedId, setSelectedId, openConversation, closeConversation, send };
}
