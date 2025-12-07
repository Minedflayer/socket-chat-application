package com.message_app.demo.chat.domain;

import jakarta.persistence.*;
/**
 * Root aggregate for any conversation (currently only type "DM").
 *
 * Persistence model:
 *  - Each row represents one conversation thread.
 *  - `type` is short ("DM" now, could be "ROOM" later).
 *  - `dmKey` is a canonical, unique key for DMs: "minUser:maxUser" (case-insensitive ordering),
 *    used to ensure there is at most one DM per pair.
 *
 * Lifecycle:
 *  - Created when the first message is sent or when a DM is explicitly "opened" and didn't exist.
 */

@Entity @Table(name="conversations")
public class Conversation {

    /**
     * Conversation type (e.g., "DM"). Kept tiny (length=8) for easy indexing later.
     * Could be used for polymorphic behavior at the application layer.
     */
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Canonical pair key for DMs, e.g., "alice:bob".
     * Enforced unique so that concurrent creators race safely at the DB layer.
     */
    @Column(nullable = false, length = 8)
    private String type = "DM";

    // Canoncial pair key: minUserId:maxUserId (unique -> one DM per pair)
    @Column(unique = true, length = 256)
    private String dmKey;

    public Conversation() {
    }

    public void setDmKey(String key) {
        this.dmKey = key;
    }

    public void setType(String type) {
        this.type = type;
    }

    // Database identifier
    public Long getId() {
        return id;
    }
}
