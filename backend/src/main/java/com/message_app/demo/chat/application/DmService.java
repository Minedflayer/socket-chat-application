package com.message_app.demo.chat.application;


import com.message_app.demo.chat.domain.Conversation;


/**
 * Service interface on the Application-layer that manages direct message (DM) conversations.
 *
 * <p><b>Architecture role:</b></p>
 * <ul>
 *     <li>Functions as bridge between the WebSocket layer
 *     ({@code DmWebSocketController}) ant the persistence layer
 *     (repositories for {@code Conversation}, {@code ConversationMember}, {@code Message})</li>
 *     <li>Encapsulates business logic for creating or retrieving one-on-one conversations
 *  *       and for determining whether a user exists in the system.</li>
 *     <li>
 *      Allows the controller layer to remain clean and independent of JPA logic,
 *      supporting good separation of concerns (MVC / layered design).
 *     </li>
 * </ul>
 *
 * Implemented by {@link com.message_app.demo.chat.application.DmServiceImpl}.
 */
public interface DmService {
    /**
     * Retrieves an existing direct message (DM) conversation between two users,
     * or creates a new one if it does not already exist.
     *
     * <p>Implementation detail:</p>
     * - The conversation is uniquely identified by a canonical key
     *   (alphabetical order of usernames, e.g., "alice:bob").
     * - Throws {@link IllegalArgumentException} if a user tries to start a DM with themselves.
     *
     * @param u1 first username
     * @param u2 second username
     * @return an existing or newly created {@link Conversation} entity
     */

    Conversation getOrCreateDm(String u1, String u2);
    /**
     * Determines whether a user exists in the system.
     *
     * <p>Typical implementation checks:</p>
     * - If the username appears in any conversation member table
     * - Or if the user has previously sent messages
     * - Or if the user is currently online (tracked by {@code OnlineUserRegistry})
     *
     * @param username the username to check
     * @return true if the user exists or is online; false otherwise
     */
    boolean userExists(String username);
}
