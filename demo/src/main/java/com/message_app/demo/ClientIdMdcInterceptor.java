package com.message_app.demo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.messaging.*;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import java.util.List;

/**
* ChannelInterceptor lets you hook the Spring Messaging pipeline for STOMP frames
* (CONNECT, SUBSCRIBE, SEND, MESSAGE, DISCONNECT, etc.)
* */
@Component
public class ClientIdMdcInterceptor implements ChannelInterceptor {
    private static final String CLIENT_ID_HEADER = "x-client-id";
    private static final String MDC_KEY = "clientId";
    private static final Logger log = LoggerFactory.getLogger(ClientIdMdcInterceptor.class);

    /**
     * preSend runs before Spring processes a frame.
     * The function does three things:
     * 1) Unwrap headers
     * 2) Extract x-client-id
     * 3) Set MDC for this thread
     * */

    // Runs before Spring processes each incoming frame
    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        //StompHeaderAccessor sha = StompHeaderAccessor.wrap(message); // Wraps the headers, gives access to STOMP commands.
        StompHeaderAccessor sha = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if(sha == null) return message;

        // Some outbound frames (e.g., CONNECT_ACK, HEARTBEAT) have no attrs/command
        SimpMessageType type = sha.getMessageType();
        if(type == SimpMessageType.CONNECT_ACK || type == SimpMessageType.HEARTBEAT) {
            return message;
        }

        // Prefer native header first (from CONNECT/SEND frames)
        String clientId = sha.getFirstNativeHeader(CLIENT_ID_HEADER);

        var attributes = sha.getSessionAttributes();

        if(clientId != null) {
           // sha.getSessionAttributes().put(MDC_KEY, clientId);
            if(attributes != null) attributes.put(MDC_KEY, clientId);

        } else if (attributes != null) {
            Object cached = attributes.get(MDC_KEY);
            if(cached instanceof String) clientId = (String) cached;
            //Object cached = sha.getSessionAttributes().get("clientId");
            //if (cached instanceof String) clientId = (String) cached;
        }

        if(clientId != null) {
            MDC.put(MDC_KEY, clientId);

        }

        if(log.isDebugEnabled()) {
            log.debug("event=stomp_pre_send cmd={} simpSessionId={}",
                    sha.getCommand(), sha.getDestination(), sha.getSessionId());

        }
        return message;
    }

    // Runs after the frame is processed, removes thread from clientId.
    @Override
    public void afterSendCompletion(Message<?> message, MessageChannel channel, boolean sent, Exception ex) {
        MDC.remove(MDC_KEY);
    }
}
