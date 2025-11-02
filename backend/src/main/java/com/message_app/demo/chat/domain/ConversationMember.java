package com.message_app.demo.chat.domain;

import com.message_app.demo.chat.domain.Conversation;
import jakarta.persistence.*;

/**
 * Join table between Conversation and participating users.
 * <p>
 * Why a table instead of storing usernames on Conversation?
 * - Works for DMs now (two rows), but also scales to group chats later (N rows).
 * <p>
 * Constraints & indexing:
 * - (conversation_id, username) should be unique for correctness (one row per user per conversation).
 * - An index on `username` supports lookups like "find all conversations for user X".
 */

/*@Entity
@Table(name="conversation_members",
        uniqueConstraints=@UniqueConstraint(columnNames={"conversation_id","username"}))*/
@Entity
@Table(name = "conversation_members", indexes = {
        @Index(name = "idx_cm_username", columnList = "username")
})
public class ConversationMember {
    /**
     * Surrogate PK.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Owning side of the relationship: many members belong to one conversation.
     * Optional=false enforces referential integrity (member must belong to a conversation).
     */
    @ManyToOne(optional = false)
    @JoinColumn(name = "conversation_id")
    private Conversation conversation;

    @Column(nullable = false, length = 128)
    private
    String username;

    public Long getId() {
        return id;
    }

    public Conversation getConversation() {
        return conversation;
    }

    public void setConversation(Conversation conversation) {
        this.conversation = conversation;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

}
