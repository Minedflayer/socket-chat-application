package com.message_app.demo.auth.api;

import com.message_app.demo.auth.infrastructure.security.JwtService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * DEV-ONLY: issues a JWT for a username/password.
 * Replace with a real user store later.
 */
@RestController
@RequestMapping("/auth")
public class AuthController {
    private final JwtService jwtService;

    public AuthController(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    // Login-endpoint to issue tokens (dev)
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");

        // DEV: accept any non-empty username + "password" as the password
        if (username == null || username.isBlank() || !"password".equals(password)) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
        }

        String token = jwtService.issue(username, List.of("ROLE_USER"), 3600);
        return ResponseEntity.ok(Map.of("token", token));
    }

    @PostMapping("/dev-login")
    public ResponseEntity<?> devLogin(@RequestBody Map<String, String> body) {
        String username = (body.getOrDefault("username", "")).trim();
        if (username.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "username required"));
        }
        String token = jwtService.issue(username, List.of("ROLE_USER"), 60 * 60 * 12);
        return ResponseEntity.ok(Map.of("token", token, "username", username));
    }


}
