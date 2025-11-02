package com.message_app.demo.chat.infrastructure.persistence;

import com.message_app.demo.chat.domain.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * Repository for {@link Conversation} entities.
 *
 * Primary purpose:
 *  - Fetch existing conversations by their canonical DM key ("a:b").
 *  - Support creation and retrieval operations in  com.message_app.demo.chat.application.DmServiceImpl.
 */
public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    /**
     * Retrieve a conversation by its unique DM key.
     *
     * The DM key is an ordered, canonical string (e.g., "alice:bob"),
     * ensuring that only one DM exists per user pair.
     *
     * @param dmKey the canonical DM key.
     * @return Optional containing the conversation if found.
     */
    Optional<Conversation> findByDmKey(String dmKey);
}



