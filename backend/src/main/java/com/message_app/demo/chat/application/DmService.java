package com.message_app.demo.chat.application;

import com.message_app.demo.realtime.WebSocketEvents;
import com.message_app.demo.chat.domain.Conversation;
import com.message_app.demo.chat.domain.ConversationMember;
import com.message_app.demo.chat.infrastructure.persistence.ConversationMemberRepository;
import com.message_app.demo.chat.infrastructure.persistence.ConversationRepository;
import com.message_app.demo.chat.infrastructure.persistence.MessageRepository;
import jakarta.transaction.Transactional;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

public interface DmService {
    Conversation getOrCreateDm(String u1, String u2);
    boolean userExists(String username);
}
