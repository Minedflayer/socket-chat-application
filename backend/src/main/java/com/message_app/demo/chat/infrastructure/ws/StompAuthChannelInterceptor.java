package com.message_app.demo.chat.infrastructure.ws;
// Authenticate on STOMP CONNECT (ChannelInterceptor)

import com.message_app.demo.auth.infrastructure.security.JwtService;
import org.slf4j.Logger; import org.slf4j.LoggerFactory;
import org.springframework.messaging.*;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.stomp.*;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;

import java.security.Principal;


/**
 * ChannelInterceptor that runs when STOMP frames pass through the inbound channel.
 * Responsibilities:
 *  - On CONNECT: extract "Authorization: Bearer <jwt>" from headers.
 *  - Validate JWT using JwtService.
 *  - Build a Spring Security Authentication (UsernamePasswordAuthenticationToken).
 *  - Attach that Authentication as the session "user" (Principal).
 * Once set, the user is available as Principal in @MessageMapping methods,
 * and Spring Messaging Security can enforce authorization rules.
 */
@Component
public class StompAuthChannelInterceptor implements ChannelInterceptor {
    private static final String AUTH_KEY = "auth";
    private static final Logger log = LoggerFactory.getLogger(StompAuthChannelInterceptor.class);
    private final JwtService jwt;

    private final java.util.concurrent.ConcurrentMap<String, Principal> bySession = new java.util.concurrent.ConcurrentHashMap<>();

    public StompAuthChannelInterceptor(JwtService jwt) { this.jwt = jwt; }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor acc = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (acc == null) return message;

        String sid = acc.getSessionId();

        if (StompCommand.CONNECT.equals(acc.getCommand())) {

            // ... read Authorization, parse JWT -> username ...
            String authz = first(acc.getNativeHeader("Authorization"));
            String username;
            if (authz != null && authz.startsWith("Bearer ")) {
                var jws = jwt.parse(authz.substring("Bearer ".length()).trim());
                username = jwt.userName(jws);
                if (username == null || username.isBlank())
                    throw new IllegalStateException("JWT parsed but username was null/blank");
                log.warn("STOMP CONNECT attached user via JWT -> {}", username);
            } else {
                throw new IllegalArgumentException("Missing Authorization: Bearer <JWT>");
            }
            var auth = new UsernamePasswordAuthenticationToken(username, "N/A");

            acc.setUser(auth); // mutate headers on the original accessor
            var attrs = acc.getSessionAttributes();
            if (attrs != null) attrs.put(AUTH_KEY, auth);
            if (sid != null) bySession.put(sid, auth); // your session cache
        } else {
            if (acc.getUser() == null) {
                var attrs = acc.getSessionAttributes();
                if (attrs != null) {
                    Object cached = attrs.get(AUTH_KEY);
                    if (cached instanceof Principal p) acc.setUser(p);
                }
            }
            if (acc.getUser() == null && sid != null) {
                Principal p = bySession.get(sid);
                if (p != null) acc.setUser(p);
            }
            if (acc.getUser() == null) {
                Principal headerUser = SimpMessageHeaderAccessor.getUser(message.getHeaders());
                if (headerUser != null) acc.setUser(headerUser);
            }
            log.warn("preSend cmd={} sid={} user={}", acc.getCommand(), sid, acc.getUser());
        }
        // ✅ Rebuild message so header mutations are definitely applied downstream
        return MessageBuilder.createMessage(message.getPayload(), acc.getMessageHeaders());
    }

    private static String first(java.util.List<String> xs) { return (xs != null && !xs.isEmpty()) ? xs.get(0) : null; }
}

