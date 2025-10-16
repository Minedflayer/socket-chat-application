package com.message_app.demo.chat.domain;

import com.message_app.demo.chat.domain.Conversation;
import jakarta.persistence.*;

import java.time.Instant;

@Entity @Table(name="messages")
public class Message {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false) private Conversation conversation;
    @Column(nullable = false, length = 128) private String sender;
    @Column(nullable = false, length = 2000) private String content;
    @Column(nullable = false, updatable = false) private Instant sentAt = Instant.now();

    public Long getId() {
        return id;
    }

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

}
