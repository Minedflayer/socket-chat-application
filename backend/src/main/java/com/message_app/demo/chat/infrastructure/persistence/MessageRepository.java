package com.message_app.demo.chat.infrastructure.persistence;

import com.message_app.demo.chat.domain.Message;
import com.message_app.demo.chat.domain.Conversation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repository for {@link Message} entities.
 *
 * Responsibilities:
 *  - Retrieve messages for conversations (with pagination & ordering).
 *  - Check message sender existence (for user existence heuristics).
 *
 * Common usage:
 *  - {@link com.message_app.demo.chat.api.DmWebSocketController} uses it to persist messages.
 *  - {@link com.message_app.demo.chat.application.DmServiceImpl#userExists(String)} uses it
 *    to check if a username has ever sent a message.
 */
public interface MessageRepository extends JpaRepository<Message, Long> {

    /**
     * Retrieve all messages for a conversation ordered by ascending timestamp.
     *
     * Supports pagination to efficiently fetch message history in chunks.
     *
     * @param c the conversation whose messages to retrieve.
     * @param p Spring Data {@link Pageable} controlling page size and number.
     * @return a {@link Page} of messages ordered by `sentAt` ascending.
     */
    Page<Message> findByConversationOrderBySentAtAsc(Conversation c, Pageable p);

    /**
     * Check if any message exists with a given sender username (case-insensitive).
     *
     * Used by {@link com.message_app.demo.chat.application.DmServiceImpl#userExists(String)}
     * to confirm if a user has sent messages in the past.
     *
     * @param sender username to check.
     * @return true if at least one message from that sender exists.
     */
    boolean existsBySenderIgnoreCase(String sender);
}
