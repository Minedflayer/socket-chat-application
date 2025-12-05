package com.message_app.demo.chat.domain;

import com.message_app.demo.chat.domain.Conversation;
import jakarta.persistence.*;
import java.time.Instant;

/**
 * A single message within a conversation.
 *
 * Persistence model:
 *  - Belongs to exactly one Conversation.
 *  - Stores the sender's username (string) rather than a foreign key to a User table,
 *    which keeps the model simple and decoupled from any user directory.
 *  - `sentAt` defaults to the entity creation time in JVM (good enough for most chat uses).
 */
@Entity @Table(name="messages")
public class Message {
    /** Surrogate PK. */
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(optional = false) private Conversation conversation;
    @Column(nullable = false, length = 128) private String sender; // Sender's username
    @Column(nullable = false, length = 2000) private String content; // Message body

    /**
     * Creation timestamp. Marked updatable=false so JPA won’t overwrite it.
     * If you need DB time or strict ordering across nodes, consider DB default NOW() + @CreationTimestamp.
     */
    @Column(nullable = false, updatable = false) private Instant sentAt = Instant.now();

    // Getters/Setters
    public Long getId() {
        return id;
    }
   /* public Long getSenderId() {
        return sender;
    }*/
    public Conversation getConversation() {
        return conversation;
    }
    public void setConversation(Conversation conversation) {
        this.conversation = conversation;
    }
    public String getContent() {
        return content;
    }
    public void setContent(String content) {
        this.content = content;
    }
    public void setSenderId(String sender) {
        this.sender = sender;
    }
    public Instant getSentAt() {
        return sentAt;
    }
    public void setSentAt(Instant sentAt) {
        this.sentAt = sentAt;
    }

    public String getSenderId() {
        return sender;
    }
}
