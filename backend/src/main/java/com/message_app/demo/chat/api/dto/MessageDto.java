package com.message_app.demo.chat.api.dto;

import java.time.Instant;

public record MessageDto(
        Long id,
        Long conversationId,
        String sender,
        String content,
        Instant sentAt
) { }
