package com.message_app.demo.chat.domain;

import com.message_app.demo.chat.domain.Conversation;
import jakarta.persistence.*;

/*@Entity
@Table(name="conversation_members",
        uniqueConstraints=@UniqueConstraint(columnNames={"conversation_id","username"}))*/
@Entity
@Table(name = "conversation_members", indexes = {
        @Index(name = "idx_cm_username", columnList = "username")
})
public class ConversationMember {
    @Id @GeneratedValue(strategy= GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(optional = false)
    @JoinColumn(name = "conversation_id")
    private Conversation conversation;

    @Column(nullable = false, length = 128) private
    String username;

    public Long getId() { return id; }

    public Conversation getConversation() { return conversation; }
    public void setConversation(Conversation conversation) { this.conversation = conversation; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public void setUserId(long a) {
    }
}
