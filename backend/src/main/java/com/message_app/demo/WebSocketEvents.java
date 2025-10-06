package com.message_app.demo;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;

import java.security.Principal;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class WebSocketEvents {
    private static final Logger log = LoggerFactory.getLogger(WebSocketEvents.class);
    private static final Set<String> onlineUsers = ConcurrentHashMap.<String>newKeySet();

    @EventListener
    public void onConnect(org.springframework.web.socket.messaging.SessionConnectEvent e) {
        var sha = StompHeaderAccessor.wrap(e.getMessage());
        Principal p = SimpMessageHeaderAccessor.getUser(e.getMessage().getHeaders());
        if (p != null) onlineUsers.add(p.getName());
        log.info("event=session_connect simpSessionId={} ver={} hb={}",
                sha.getSessionId(),
                sha.getFirstNativeHeader("accept-version"),
                sha.getFirstNativeHeader("heart-beat"));
    }

    @EventListener
    public void onDisconnect(org.springframework.web.socket.messaging.SessionDisconnectEvent e) {
        Principal p = e.getUser();
        if (p != null) {
            onlineUsers.remove(p.getName());
        }
        log.info("event=session_disconnect simpSessionId={} close={}", e.getSessionId(), e.getCloseStatus());
    }

    @EventListener
    public void onSubscribe(org.springframework.web.socket.messaging.SessionSubscribeEvent e) {
        var sha = StompHeaderAccessor.wrap(e.getMessage());
        log.info("event=session_subscribe simpSessionId={} dest={}", sha.getSessionId(), sha.getDestination());
    }

    public static boolean isOnline(String u) { return onlineUsers.contains(u); }

}
