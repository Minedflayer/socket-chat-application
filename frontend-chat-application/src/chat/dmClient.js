export const MAX_MESSAGE_LENGTH = 2000;

export function publishMessage(client, recipient, draft, headers = {}) {
  if (!client?.connected) throw new Error('Connect to chat before sending. Your draft has been kept.');
  if (!recipient) throw new Error('Select a conversation before sending.');
  const content = draft.trim();
  if (!content) throw new Error('Enter a message before sending.');
  if (content.length > MAX_MESSAGE_LENGTH) throw new Error('Messages can contain at most 2,000 characters.');
  client.publish({ destination: `/app/dm/${recipient}/send`, body: JSON.stringify({ content }), headers });
}

// History and live delivery can overlap. Keep each saved message once.
export function mergeMessages(...lists) {
  const unique = new Map(lists.flat().map((message) => [message.id, message]));
  return [...unique.values()].sort((a, b) => Date.parse(a.sentAt) - Date.parse(b.sentAt) || a.id - b.id);
}

export function requestOpen(client, username) {
  let cancel;
  const promise = new Promise((resolve, reject) => {
    let subscription;
    let timer;
    let finished = false;
    const finish = (error, reply) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      try {
        if (client.connected) subscription?.unsubscribe();
      } catch {
        // The transport can close between the connection check and cleanup.
      }
      error ? reject(error) : resolve(reply);
    };
    cancel = () => finish(new Error('Connection lost while opening the conversation.'));
    try {
      if (!client.connected) throw new Error('Connect to chat before opening a conversation.');
      timer = setTimeout(() => finish(new Error('Opening timed out. Check the username and try again.')), 10000);
      subscription = client.subscribe('/user/queue/dm/open', (frame) => {
        try {
          const reply = JSON.parse(frame.body);
          if (reply.errorCode) throw new Error(reply.message || 'Could not open the conversation.');
          if (!Number.isSafeInteger(reply.conversationId) || reply.conversationId <= 0) throw new Error('Invalid conversation reply.');
          finish(null, reply);
        } catch (error) {
          finish(error);
        }
      });
      client.publish({ destination: `/app/dm/${username}/open`, body: '{}' });
    } catch (error) {
      finish(error);
    }
  });
  return { promise, cancel };
}
