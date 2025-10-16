package com.message_app.demo.realtime;

import org.springframework.stereotype.Component;

// todo: Add file to git.
@Component
 class OnlineUserRegistrySocketAdapter implements OnlineUserRegistry {
    private final WebSocketEvents events;

    OnlineUserRegistrySocketAdapter(WebSocketEvents events) {
        this.events = events;
    }
    @Override
    public boolean isOnline(String username) {
        return events.isOnline(username);
    }
}
