package com.message_app.demo.rooms.domain;

import jakarta.persistence.*;

@Entity @Table(name="conversations")
public class Conversation {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

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

    public Long getId() {
        return id;
    }

}
