package com.message_app.demo.chat.application;
//Todo Add file to Git

import com.message_app.demo.chat.domain.Conversation;
import com.message_app.demo.chat.domain.ConversationMember;
import com.message_app.demo.chat.infrastructure.persistence.ConversationMemberRepository;
import com.message_app.demo.chat.infrastructure.persistence.ConversationRepository;
import com.message_app.demo.chat.infrastructure.persistence.MessageRepository;
import com.message_app.demo.realtime.OnlineUserRegistry;
import jakarta.transaction.Transactional;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

@Service
@Transactional
 class DmServiceImpl implements DmService {

    /**
     * Service responsible for:
     *  - Finding or creating a *direct message* (DM) conversation between two users
     *  - Basic user existence checks used by the DM open flow
     *
     * Transactionality:
     *  - Class-level @Transactional ensures the create path is atomic
     *    (e.g., create Conversation + two ConversationMember rows).
     *
     * Concurrency:
     *  - We build a canonical dmKey "a:b" (alphabetical by username, case-insensitive)
     *    to guarantee *one* DM per user pair.
     *  - If two requests race, the unique constraint at the DB layer throws
     *    DataIntegrityViolationException, which we catch and then re-read.
     */
    private final ConversationRepository convs;
    private final ConversationMemberRepository members;
    private final MessageRepository messages;
    private final OnlineUserRegistry online; // Tracks connected users

    DmServiceImpl(ConversationRepository convs, ConversationMemberRepository members, MessageRepository messages, OnlineUserRegistry online) {
        this.convs = convs;
        this.members = members;
        this.messages = messages;
        this.online = online;
    }

    /**
     * Resolve an existing DM or create a new one for (u1, u2).
     * @throws IllegalArgumentException if a user tries to DM themselves.
     */
    @Override
    public Conversation getOrCreateDm(String u1, String u2) {
        if (u1.equals(u2)) throw new IllegalArgumentException("DM with self not allowed");
        // stable key: alphabetical order
        String a = u1.compareToIgnoreCase(u2) < 0 ? u1 : u2;
        String b = u1.compareToIgnoreCase(u2) < 0 ? u2 : u1;
        String key = a + ":" + b;

        return convs.findByDmKey(key).orElseGet(() -> createDm(key, a, b));
    }

    /**
     * Create the conversation + two membership rows, with a race-safe fallback.
     * If another thread already created the conversation, we look it up again.
     */
    private Conversation createDm(String key, String a, String b) {
        try {
            Conversation c = new Conversation();
            c.setType("DM");
            c.setDmKey(key);
            c = convs.saveAndFlush(c);

            ConversationMember m1 = new ConversationMember();
            m1.setConversation(c); m1.setUsername(a); members.save(m1);

            ConversationMember m2 = new ConversationMember();
            m2.setConversation(c); m2.setUsername(b); members.save(m2);

            return c;
        } catch (DataIntegrityViolationException e) {
            return convs.findByDmKey(key).orElseThrow();
        }
    }

    //TODO Fix userExists function. Needs a variable to store users. Could probably use or add variable in ConversationMemberRepository
    /**
     * Lightweight existence check used before opening a DM:
     *  - Accepts any of:
     *      • Users who appear in ConversationMember (ever had a DM created)
     *      • Users who have sent messages before
     *      • Users currently online (from the in-memory OnlineUserRegistry)
     *
     * This is pragmatic for development: you can DM an online user even if they
     * have no DB footprint yet. Tighten the policy later if you introduce a proper
     * user directory / account table.
     */
    @Override
    public boolean userExists(String username) {
        if (username == null || username.isBlank()) return false;
        String u = username.trim();
        //if (u.isEmpty()) return false;
        if (members.existsByUsernameIgnoreCase(u)) return true;
        if (messages.existsBySenderIgnoreCase(u)) return true;
        // ✅ treat any *connected* user as existing (optional but great for dev)
        return online.isOnline(u); // maintain this set from connect/disconnect events

        // Option B: fallback — has sent any message before
        //return messages.existsBySenderIgnoreCase(u);
    }
}
