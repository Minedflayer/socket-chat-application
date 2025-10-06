package com.message_app.demo.rooms.repo;

import com.message_app.demo.rooms.domain.Message;
import com.message_app.demo.rooms.domain.Conversation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MessageRepository extends JpaRepository<Message, Long> {

    // fetch messages for a conversation in order
    Page<Message> findByConversationOrderBySentAtAsc(Conversation c, Pageable p);
    boolean existsBySenderIgnoreCase(String  sender);
}