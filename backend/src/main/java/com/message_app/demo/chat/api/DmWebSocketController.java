package com.message_app.demo.chat.api;

import com.message_app.demo.chat.api.dto.MessageDto;
import com.message_app.demo.chat.domain.Conversation;
import com.message_app.demo.chat.domain.Message;
import com.message_app.demo.chat.application.DmService;
import com.message_app.demo.chat.infrastructure.persistence.MessageRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.messaging.simp.user.SimpUserRegistry;
import org.springframework.stereotype.Controller;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.RestController;

import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.AccessDeniedException;
import java.security.Principal;
import java.time.Instant;

@Validated
//@Controller
@RestController
//@RequiredArgsConstructor
public class DmWebSocketController {

    private final SimpMessagingTemplate broker; // Sends messages to users
    private final DmService dmService; // Business logic for DM lookup/creation
    private final MessageRepository messages; // Persistence for message entities
    private final SimpUserRegistry userRegistry;

    // =======================
    // Outbound (Server → User) destinations
    // These are *user* queues. Spring will prefix internally, e.g. `/user/{name}/queue/...`
    // =======================
    // === WebSocket Destinations ===
    private static final String QUEUE_DM_BASE = "/queue/dm/";
    private static final String QUEUE_DM_OPEN = "/queue/dm/open";
    private static final String QUEUE_WHOAMI = "/queue/whoami";
    private static final String QUEUE_DM_NOTIFY = "/queue/dm/notify";


    // === MessageMapping Prefixes (Client to Server) ===
    private static final String MAPPING_DM_SEND = "/dm/{otherUserName}/send";
    private static final String MAPPING_DM_OPEN = "/dm/{otherUserName}/open";
  //  private static final String MAPPING_WHOAMI = "/whoami";
    private static final Logger log = LoggerFactory.getLogger(DmWebSocketController.class);

    // === Records ===
    /** DM "send" input payload. Validated by {@link @Validated} on the controller. */
    public record ChatIn(@NotBlank String content) {
    }
    /** Minimal notifier shape you could send to inbox lists / badges (kept here for future use). */
    public record DmNotifier(Long conversationId, String from, String preview, Instant sentAt, long unreadCount) {
    }
    public record OpenOut(Long conversationId) {
    }
    /** Success payload for OPEN requests. */
    public record OpenOk(Long conversationId, String otherUsername) {
    }
    /** Error payload for OPEN requests (sent back to the requesting user). */
    public record OpenErr(String errorCode, String message, String otherUsername) {
    }


    public DmWebSocketController(SimpMessagingTemplate broker, DmService dmService, MessageRepository messages, SimpUserRegistry userRegistry) {
        this.broker = broker;
        this.dmService = dmService;
        this.messages = messages;
        this.userRegistry = userRegistry;
    }

    /**
     * Client publishes to: `/app/dm/{otherUserName}/send`
     *
     * Flow:
     *  1) Verify requester is authenticated (has Principal)
     *  2) Resolve or create the DM conversation between the two users
     *  3) Persist the message
     *  4) Emit the saved MessageDto to *both* participants via their user queues:
     *     `/user/{me}/queue/dm/{convId}` and `/user/{other}/queue/dm/{convId}`
     *
     * Client consumption pattern:
     *  - Each participant subscribes to `/user/queue/dm/{convId}` to receive messages in that DM.
     */
    @MessageMapping(MAPPING_DM_SEND)
    public void send(@DestinationVariable String otherUserName, ChatIn in, Principal principal) throws AccessDeniedException {
        final String me = (principal != null) ? principal.getName() : null;
        if (me == null) throw new AccessDeniedException("Unauthenticated");

        log.info("🟢 DM_SEND invoked by user={} → target={}", me, otherUserName);

        Conversation conv = dmService.getOrCreateDm(me, otherUserName);

        // Persist domain entity
        Message m = new Message();
        m.setConversation(conv);
        m.setSenderId(me);
        m.setContent(in.content());
        m = messages.save(m);

        // Check if recipeint is online
        boolean recipientOnline = userRegistry.getUser(otherUserName) != null;

        // Append to message log
        try (var writer = new FileWriter("message_log.txt", true)) {
            writer.write(String.format(
                    "%s | conv=%d | from=%s | to=%s | content=%s | delivered=%s%n",
                    Instant.now(),
                    conv.getId(),
                    me,
                    otherUserName,
                    m.getContent(),
                    recipientOnline ? "LIVE" : "OFFLINE"
            ));
        } catch (IOException e) {
            log.error("Failed to write message log", e);
        }


        // Outgoing message. Map domain entity -> wire DTO
        MessageDto out = new MessageDto(
                m.getId(),
                conv.getId(),
                me,
                m.getContent(),
                m.getSentAt()
        );
        // Send to both sender and recipient
        log.debug("📤 [DM_SEND] Sending to users: {}, {}", me, otherUserName);
        broker.convertAndSendToUser(me, QUEUE_DM_BASE + conv.getId(), out);
        broker.convertAndSendToUser(otherUserName, QUEUE_DM_BASE + conv.getId(), out);

        // Send notifier to deceiver
        String preview = m.getContent().length() > 40 ? m.getContent().substring(0, 37) + "..." : m.getContent();

        // Monitor the amount of unread messages
        long unreadCount = 1; // Placeholder
                //messages.countByConversationIdAndRecipientUnread(conv.getId(), otherUserName);

        DmNotifier notify = new DmNotifier(
                conv.getId(),
                me,
                preview,
                m.getSentAt(),
                unreadCount
        );
        log.info("🔔 Sending DM notifier to user={} convId={} preview='{}'", otherUserName, conv.getId(), preview);
        broker.convertAndSendToUser(otherUserName, QUEUE_DM_NOTIFY, notify);
        log.info("✅ DM_SEND completed successfully for sender={} recipient={} (online={})", me, otherUserName, recipientOnline);

    }

    /**
     * Client publishes to: `/app/dm/{otherUserName}/open`
     * Returns (to the requesting user only): {@link OpenOk} or {@link OpenErr}
     *
     * Purpose:
     *  - Resolve/initialize the DM and return the conversationId so the client can
     *    subscribe to `/user/queue/dm/{conversationId}` and start sending/receiving.
     */
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

    /**
     * Client publishes to: `/app/whoami`
     * Returns (to the requesting user): the authenticated username.
     *
     * Useful for debugging STOMP auth/headers during development.
     */
   /* @MessageMapping(MAPPING_WHOAMI)
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
    }*/

    /**
     * Centralized exception → {@link OpenErr} for the OPEN flow.
     * Any exception thrown inside `open(...)` will be mapped here and returned to the user
     * on `/user/queue/dm/open`.
     */
    @org.springframework.messaging.handler.annotation.MessageExceptionHandler
    @SendToUser(QUEUE_DM_OPEN)
    public OpenErr handleOpenErrors(Exception ex) {
        // You can inspect ex to tailor codes if you want
        return new OpenErr("OPEN_FAILED", ex.getMessage(), null);
    }
}
