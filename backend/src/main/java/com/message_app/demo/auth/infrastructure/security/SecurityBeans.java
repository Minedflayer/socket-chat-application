package com.message_app.demo.auth.infrastructure.security;

import com.message_app.demo.auth.infrastructure.security.JwtService;
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
    public JwtService jwtService() {
        // dev only. In prod load from env/keystore and make it >= 256 bits
        return new JwtService("mGFM1hKpMDSbHas7gfS1d4MYCQ1AiA/WiEbqUuiQzYk=");
    }
}
