package com.message_app.demo;

import com.message_app.demo.security.StompAuthChannelInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.*;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final StompAuthChannelInterceptor auth;
    private final ClientIdMdcInterceptor mdc;
    public WebSocketConfig(StompAuthChannelInterceptor auth, ClientIdMdcInterceptor mdc) {
        this.mdc= mdc;
        this.auth = auth;
    }
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/chat")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.setApplicationDestinationPrefixes("/app");
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // order: auth first (sets user), then mdc (for logging)
        registration.interceptors(auth, mdc);
    }

    public void configureClientOutboundChannel(ChannelRegistration registration) {
        registration.interceptors(mdc);
    }
}



