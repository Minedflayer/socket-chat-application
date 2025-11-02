package com.message_app.demo.chat.api;

import com.message_app.demo.chat.api.dto.ChatMessage;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
public class ChatController {
    /**
     * Handles simple broadcast chat messages.
     *
     * Flow:
     *  1) Client publishes to STOMP destination: `/app/message`
     *  2) Spring routes to {@link #handle(ChatMessage, Principal)}
     *  3) Controller forwards payload to broker destination `/topic/public`
     *
     * Notes:
     *  - `principal.getName()` comes from the authenticated STOMP session (JWT subject),
     *    set by your `StompAuthChannelInterceptor`.
     *  - `SimpMessagingTemplate.convertAndSend` sends to a *topic* (publish/subscribe),
     *    so all clients subscribed to `/topic/public` receive the message.
     */
    private static final Logger log = LoggerFactory.getLogger(ChatController.class);
    private final SimpMessagingTemplate simp;
    public ChatController(SimpMessagingTemplate simp) {
        this.simp = simp;
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
