package com.message_app.demo.chat.infrastructure.persistence;

import com.message_app.demo.chat.domain.ConversationMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

/**
 * Repository for accessing and querying {@link ConversationMember} entities.
 *
 * Responsibilities:
 *  - Look up whether users participate in certain conversations.
 *  - Support DM discovery by finding a conversation that includes both users.
 *
 * Naming conventions:
 *  - Spring Data automatically parses method names like `existsByUsernameIgnoreCase`
 *    into SQL queries.
 *  - For more complex multi-user lookups, a custom JPQL query is used.
 */
public interface ConversationMemberRepository extends JpaRepository<ConversationMember, Long> {

    /**
     * Check if a specific username is part of a given conversation.
     *
     * Useful for validating whether a user is allowed to send messages
     * in that conversation or for authorization checks.
     *
     * @param conversationId ID of the conversation.
     * @param username       Username to check.
     * @return true if the username is a member of that conversation.
     */
    boolean existsByConversation_IdAndUsername(Long conversationId, String username);

    /**
     * Check if a conversation member exists for a given username, ignoring case.
     *
     * Used by {@code DmService.userExists(...)} to verify if a user ever appeared
     * in any conversation.
     *
     * @param username the username to check.
     * @return true if the username exists (case-insensitive).
     */
    boolean existsByUsernameIgnoreCase(String username);

    /**
     * A custom JPQL query with the purpose to find an existing DM conversation between two users
     *
     * Logic
     * - Select all conversation IDs where the username is either :a or :b.
     *      *  - Group by conversation ID.
     *      *  - Filter (HAVING) only conversations that contain both distinct usernames.
     *      *  Returns an Optional<Long> with the conversation ID if such a conversation exists.
     * @param a first username
     * @param b second username
     * @return conversation ID if both users are members in the same DM conversation
     */
    @Query("""
     select cm.conversation.id
     from ConversationMember cm
     where cm.username in (:a, :b)
     group by cm.conversation.id
     having count(distinct cm.username) = 2
  """)
    Optional<Long> findDmConversationId(@Param("a") String a, @Param("b") String b);
}

