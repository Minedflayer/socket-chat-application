package com.message_app.demo.auth.infrastructure.security;

import com.message_app.demo.auth.infrastructure.security.JwtService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Spring @Configuration class for providing security-related beans.
 * Right now it exposes JwtService as a singleton managed by Spring,
 * so it can be injected into interceptors/controllers.
 */
@Configuration
public class SecurityBeans {
    @Bean
    public JwtService jwtService(@Value("${jwt.secret}") String secret) {
        System.out.println("Loaded JWT secret from Spring: " + secret);
        return new JwtService(secret);
    }
}
