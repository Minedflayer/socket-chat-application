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
    private final ConversationRepository convs;
    private final ConversationMemberRepository members;
    private final MessageRepository messages;
    private final OnlineUserRegistry online;

    DmServiceImpl(ConversationRepository convs, ConversationMemberRepository members, MessageRepository messages, OnlineUserRegistry online) {
        this.convs = convs;
        this.members = members;
        this.messages = messages;
        this.online = online;

    }

    @Override
    public Conversation getOrCreateDm(String u1, String u2) {
        if (u1.equals(u2)) throw new IllegalArgumentException("DM with self not allowed");
        // stable key: alphabetical order
        String a = u1.compareToIgnoreCase(u2) < 0 ? u1 : u2;
        String b = u1.compareToIgnoreCase(u2) < 0 ? u2 : u1;
        String key = a + ":" + b;

        return convs.findByDmKey(key).orElseGet(() -> createDm(key, a, b));
    }

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
