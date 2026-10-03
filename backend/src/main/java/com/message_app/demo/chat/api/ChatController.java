package com.message_app.demo.chat.api;

import com.message_app.demo.chat.api.dto.MessageDto;
import com.message_app.demo.chat.domain.Message;
import com.message_app.demo.chat.infrastructure.persistence.MessageRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;
import java.util.Comparator;
import java.util.List;

/** HTTP history for direct-message conversations. */
@RestController
@RequestMapping("/api/dm")
public class ChatController {
    private final MessageRepository messages;

    public ChatController(MessageRepository messages) {
        this.messages = messages;
    }

    @GetMapping("/{conversationId}/messages")
    public List<MessageDto> recent(@PathVariable Long conversationId, @RequestParam(defaultValue = "50") int limit) {
        return messages.findTopByConversationIdOrderBySentAtDesc(conversationId, Pageable.ofSize(limit)).stream()
                .sorted(Comparator.comparing(Message::getSentAt))
                .map(m -> new MessageDto(m.getId(), m.getConversation().getId(), m.getSenderId(), m.getContent(), m.getSentAt()))
                .toList();
    }
}
