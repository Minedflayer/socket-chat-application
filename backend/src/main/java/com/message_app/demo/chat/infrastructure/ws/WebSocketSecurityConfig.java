package com.message_app.demo.chat.infrastructure.ws;

import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.security.config.annotation.web.messaging.MessageSecurityMetadataSourceRegistry;
import org.springframework.security.config.annotation.web.socket.AbstractSecurityWebSocketMessageBrokerConfigurer;

/**
 * Configures Spring Security rules specifically for STOMP/WebSocket messaging.
 *
 * - Runs AFTER your StompAuthChannelInterceptor has attached an authenticated Principal.
 * - Lets you define which destinations/types require authentication/roles.
 *
 * Notes:
 *  - This does NOT secure HTTP endpoints (that’s HttpSecurity).
 *  - Instead, it secures STOMP SEND and SUBSCRIBE frames.
 */
public class WebSocketSecurityConfig extends AbstractSecurityWebSocketMessageBrokerConfigurer {

    protected void configureInbound(MessageSecurityMetadataSourceRegistry messages) {
        messages
                .simpTypeMatchers(org.springframework.messaging.simp.SimpMessageType.CONNECT,
                        org.springframework.messaging.simp.SimpMessageType.UNSUBSCRIBE,
                        org.springframework.messaging.simp.SimpMessageType.DISCONNECT).permitAll()
                .simpDestMatchers("/app/**").authenticated()         // sending to app endpoints requires auth
                .simpSubscribeDestMatchers("/topic/**", "/queue/**").authenticated() // subscribing requires auth
                .anyMessage().authenticated();
    }


    @Override
    protected boolean sameOriginDisabled() {
        // allow cross-origin in dev
        // In production, restrict origins in your StompEndpointRegistry.
        return true;

    }
}


