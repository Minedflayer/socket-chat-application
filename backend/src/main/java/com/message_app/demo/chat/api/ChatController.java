package com.message_app.demo.chat.api;

//import com.message_app.demo.chat.api.dto.ChatMessage;
import com.message_app.demo.chat.api.dto.MessageDto;
import com.message_app.demo.chat.domain.Message;
import com.message_app.demo.chat.infrastructure.persistence.ConversationRepository;
import com.message_app.demo.chat.infrastructure.persistence.MessageRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Comparator;
import java.util.List;

//@Controller
@RestController
@RequestMapping("/api/dm")
@RequiredArgsConstructor
public class ChatController {
    /**
     * Handles simple broadcast chat messages.
     *
     * Flow:
     *  1) Client publishes to STOMP destination: `/app/message`
     //*  2) Spring routes to {@link #handle(ChatMessage, Principal)}
     *  3) Controller forwards payload to broker destination `/topic/public`
     *
     * Notes:
     *  - `principal.getName()` comes from the authenticated STOMP session (JWT subject),
     *    set by your `StompAuthChannelInterceptor`.
     *  - `SimpMessagingTemplate.convertAndSend` sends to a *topic* (publish/subscribe),
     *    so all clients subscribed to `/topic/public` receive the message.
     */

    private final MessageRepository messages;
    private final ConversationRepository  convs;
    private static final Logger log = LoggerFactory.getLogger(ChatController.class);
    private final SimpMessagingTemplate simp;

    @GetMapping("/{conversationId}/messages")
    public List<MessageDto> recent(@PathVariable Long conversationId, @RequestParam(defaultValue = "50") int limit) {
        log.info("📥 [GET MESSAGES] Fetching last {} messages for conversationId={}", limit, conversationId);
        var list = messages.findTopByConversationIdOrderBySentAtDesc(conversationId, Pageable.ofSize(limit));
        log.debug("📄 [GET MESSAGES] Fetched {} messages from DB", list.size());

        // Map domain entities to DTOs
        List<MessageDto> dtos = list.stream()
                .sorted(Comparator.comparing(Message::getSentAt))
                .map(m -> new MessageDto(
                        m.getId(),
                        m.getConversation().getId(),
                        m.getSenderId(),
                        m.getContent(),
                        m.getSentAt()
                ))
                .toList();

/*        return list.stream()
                .sorted(Comparator.comparing(Message::getSentAt)) // chronological
                .map(m -> new MessageDto(m.getId(), m.getConversation().getId(), m.getSenderId(), m.getContent(), m.getSentAt()))
                .toList();*/
        log.trace("🧱 [GET MESSAGES] Returning messages: {}", dtos);
        return dtos;
    }
    @Autowired
    public ChatController(SimpMessagingTemplate simp, MessageRepository messages, ConversationRepository convs) {
        this.simp = simp;
        this. messages = messages;
        this.convs = convs;
    }

    public record PublicChatIn(
            @jakarta.validation.constraints.NotBlank
            @jakarta.validation.constraints.Size(max = 500)
            String content

    ) {}

    /**
     * Handle messages sent to /app/message.
     *
     * @param msg the incoming message payload (deserialized from JSON body).
     * @param principal the authenticated user, injected by Spring. Its name comes
     *                  from the JWT "sub" claim parsed in StompAuthChannelInterceptor.
     */
    @MessageMapping("/message")
    public void handle(@Valid PublicChatIn msg, Principal principal) {
        // The username comes from the JWT subject stored on the STOMP session.
        String user = principal != null ? principal.getName() : "anonymous";
        int len = (msg.content() == null) ? 0 : msg.content().length();
        log.info("event=chat_message_received user={} len={}", user, len);
        // Broadcast to all subscribers of `/topic/public`
        simp.convertAndSend("/topic/public", msg);
    }
}
