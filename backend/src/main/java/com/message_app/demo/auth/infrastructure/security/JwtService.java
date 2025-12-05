package com.message_app.demo.auth.infrastructure.security;


import io.jsonwebtoken.*;
//import io.jsonwebtoken.Jws;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.security.Key;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Map;

/**
 * Small utility service for parsing and validating JWTs using the JJWT library.
 * Responsibilities:
 *  - Hold the signing key (HS256 in this case).
 *  - Parse a raw token string and verify its signature.
 *  - Extract specific claims (username/roles).
 * Note: Right now we hard-code HS256 with a simple secret. In production,
 *       use a longer secret loaded from environment or keystore.
 */
public class JwtService {
    private final Key key;
    private static final Logger log = LoggerFactory.getLogger(JwtService.class);

    /**
     * Construct service with a secret key.
     * @param secret - must be >= 256 bits for HS256
     */
    public JwtService(String secret) {
        //this.key = Keys.hmacShaKeyFor(secret.getBytes());
        this.key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret)); // decode base64 before creating a key.
    }

    /**
     * Parse and validate a JWT.
     * @param rawToken - the raw "eyJ..." string
     * @return verified Jws<Claims> if valid; throws if invalid/expired
     */
    public Jws<Claims> parse(String rawToken) {
        return Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(rawToken);
    }

    public String userName(Jws<Claims> jws) {
        String username = jws.getBody().getSubject();
        log.info("JwtService: extracted username='{}' from JWT id={}", username, jws.getBody().getId());
        //return jws.getBody().getSubject();
        return username;
    }

    /**
     * Extract "roles" claim as a List<String>.
     * Returns an empty list if not present.
     */
    @SuppressWarnings("unchecked")
    public List<String> roles(Jws<Claims> jws) {
        Object r = jws.getBody().get("roles");
        return r instanceof List ? (List<String>) r : List.of();
    }

    // Sign in with the same secret.
    public String issue(String subject, List<String> roles, long ttlSeconds) {
        Instant now = Instant.now();
        return Jwts.builder()
                .setSubject(subject)
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(now.plusSeconds(ttlSeconds)))
                .addClaims(Map.of("roles", roles))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }
}
