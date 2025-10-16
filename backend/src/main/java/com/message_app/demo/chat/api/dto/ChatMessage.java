package com.message_app.demo.chat.api.dto;

public class ChatMessage {
    private String content;
    private String sender;

    /**
     * DTO representing a chat message payload exchanged over STOMP.
     *
     * How it's used:
     *  - When a client sends a JSON body like:
     *      { "content": "Hello", "sender": "Alice" }
     *    Spring automatically deserializes it into a ChatMessage instance,
     *    mapping JSON keys to these fields.
     *
     *  - In your ChatController, you can accept ChatMessage as a parameter
     *    in a @MessageMapping method and access its getters.
     *
     *  - When broadcasting back with SimpMessagingTemplate, Spring automatically
     *    serializes this object to JSON for delivery to subscribers.
     */
    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getSender() {
        return sender;
    }

    public void setSender(String sender) {
        this.sender = sender;
    }
}
