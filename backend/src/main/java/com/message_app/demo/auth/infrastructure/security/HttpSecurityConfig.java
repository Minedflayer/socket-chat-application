package com.message_app.demo.auth.infrastructure.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class HttpSecurityConfig {

    @Bean
    SecurityFilterChain httpSecurity(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                        // allow your static assets / index / health / SockJS handshake, etc.
                        .requestMatchers(
                                "/auth/**", "/", "/index.html", "/favicon.ico",
                                "/static/**", "/assets/**",
                                "/chat/**",
                                "/actuator/**",
                                "/auth/dev-login"
                        ).permitAll()
                        .anyRequest().permitAll() // or .authenticated() if you plan real HTTP auth
                )
                // Disable browser login prompts
                .httpBasic(basic -> basic.disable())
                .formLogin(form -> form.disable());
        return http.build();
    }
}
