package com.message_app.demo;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;

/**
 * Controller that handles incoming STOMP messages on the /app/message destination
 * and broadcasts them to all subscribers of /topic/public.
 *
 * Key things happening here:
 *  - The @Controller + @MessageMapping annotations make this a STOMP endpoint.
 *  - The Principal parameter is automatically injected by Spring because our
 *    StompAuthChannelInterceptor set an authenticated user on the STOMP session.
 *  - We log the event with the authenticated username and message length.
 *  - We forward (broadcast) the message to the broker, which then delivers it
 *    to all clients subscribed to /topic/public.
 */
@Controller
public class ChatController {
    private static final Logger log = LoggerFactory.getLogger(ChatController.class);
    private final SimpMessagingTemplate simp;
    public ChatController(SimpMessagingTemplate simp) {
        this.simp = simp;
    }

    /**
     * Handle messages sent to /app/message.
     *
     * @param msg the incoming message payload (deserialized from JSON body).
     * @param principal the authenticated user, injected by Spring. Its name comes
     *                  from the JWT "sub" claim parsed in StompAuthChannelInterceptor.
     */
    @MessageMapping("/message")
    public void handle(ChatMessage msg, Principal principal) {
        // principal.getName() is from the JWT subject
        String user = principal != null ? principal.getName() : "anonymous";
        log.info("event=chat_message_received user={} len={}", user,
                 msg.getContent() == null ? 0 : msg.getContent().length());
        simp.convertAndSend("/topic/public", msg);
    }
}
