package com.message_app.demo.chat.api;

import com.message_app.demo.chat.domain.Conversation;
import com.message_app.demo.chat.domain.Message;
import com.message_app.demo.chat.application.DmService;
import com.message_app.demo.chat.infrastructure.persistence.MessageRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.time.Instant;
@Controller
public class DmWebSocketController {

    // === WebSocket Destinations ===
    private static final String QUEUE_DM_BASE = "/queue/dm/";
    private static final String QUEUE_DM_OPEN = "/queue/dm/open";
    //private static final String QUEUE_DM_NOTIFY = "/queue/dm/notify";
    private static final String QUEUE_WHOAMI= "/queue/whoami";

    // === MessageMapping Prefixes (Client to Server) ===
    private static final String MAPPING_DM_SEND = "/dm{otherUserName}/send";
    private static final String MAPPING_DM_OPEN = "/dm/{otherUserName}/open";
    private static final String MAPPING_WHOAMI = "/whoami";

    private static final Logger log = LoggerFactory.getLogger(DmWebSocketController.class);
    public record ChatIn(String content) { }
    public record ChatOut(Long conversationId, String sender, String content, Instant sentAt) { }
    public record DmNotifier(Long conversationId, String from, String preview, Instant sentAt, long unreadCount) { }
    private final SimpMessagingTemplate broker;
    private final DmService dmService;
    private final MessageRepository messages;


    public DmWebSocketController(SimpMessagingTemplate broker, DmService dmService, MessageRepository messages) {
        this.broker = broker;
        this.dmService = dmService;
        this.messages = messages;

    }
    @MessageMapping(MAPPING_DM_SEND)
    public void send(@DestinationVariable String otherUserName, ChatIn in, Principal principal) {
        String me = principal.getName();
        //long meId = userIdFromPrincipal(principal);

        Conversation conv = dmService.getOrCreateDm(me, otherUserName);
        var m = new Message();
        m.setConversation(conv);
        m.setSenderId(me);
        m.setContent(in.content());
        m = messages.save(m);

        ChatOut out = new ChatOut(conv.getId(),me, m.getContent(), m.getSentAt());
        broker.convertAndSendToUser(me,           QUEUE_DM_BASE + conv.getId(), out);
        broker.convertAndSendToUser(otherUserName, QUEUE_DM_BASE + conv.getId(), out);

       // long unread = dmService.unre
    }
    private long userIdFromPrincipal(Principal p) {
        // adapt to your JwtService / Authentication
        return Long.parseLong(p.getName()); // or pull a custom claim; adjust to your app
    }
    public record OpenOut(Long conversationId) {}

    public record OpenOk(Long conversationId, String otherUsername) {}
    public record OpenErr(String errorCode, String message, String otherUsername) {}
    @MessageMapping(MAPPING_DM_OPEN)
    @SendToUser(QUEUE_DM_OPEN)
    public Object open(@DestinationVariable String otherUserName, Principal principal) {
        final String me = principal != null ? principal.getName() : "<null>";
        log.info("OPEN DM request me={} target={}", me, otherUserName);

        boolean exists = dmService.userExists(otherUserName);
        if (!exists) {
            log.warn("OPEN DM target not found me={} target={}", me, otherUserName);
            return new OpenErr("USER_NOT_FOUND", "No user with that username.", otherUserName);
        }

        Conversation conv = dmService.getOrCreateDm(me, otherUserName);
        log.info("OPEN DM resolved me={} target={} convId={}", me, otherUserName, conv.getId());
        return new OpenOk(conv.getId(), otherUserName);
    }
/*
    @MessageMapping("/whoami")
    @SendToUser("/queue/whoami")
    public String whoami(Principal p) {
        return p != null ? p.getName() : "<null>";
    }*/
@MessageMapping(MAPPING_WHOAMI)
@SendToUser(QUEUE_WHOAMI)
public String whoami(Principal principal,
                     @Header("simpSessionId") String sid,
                     org.springframework.messaging.Message<?> message) {
    Principal viaHeader = SimpMessageHeaderAccessor.getUser(message.getHeaders());

    log.warn("WHOAMI handler: sid={} argPrincipal={} type={} name={}",
            sid,
            principal,
            (principal == null ? null : principal.getClass().getName()),
            (principal == null ? null : principal.getName()));

    log.warn("WHOAMI handler: viaHeaderPrincipal={} type={} name={}",
            viaHeader,
            (viaHeader == null ? null : viaHeader.getClass().getName()),
            (viaHeader == null ? null : viaHeader.getName()));

    return principal != null ? principal.getName() : "<null>";
}

//todo Fråga AI vad jag ska göra med denna
    @org.springframework.messaging.handler.annotation.MessageExceptionHandler
    @SendToUser(QUEUE_DM_OPEN)
    public OpenErr handleOpenErrors(Exception ex) {
        // You can inspect ex to tailor codes if you want
        return new OpenErr("OPEN_FAILED", ex.getMessage(), null);
    }

}
