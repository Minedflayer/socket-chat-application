package com.message_app.demo.chat.infrastructure.persistence;

import com.message_app.demo.chat.domain.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ConversationRepository extends JpaRepository<Conversation, Long> {
    Optional<Conversation> findByDmKey(String dmKey);
}



