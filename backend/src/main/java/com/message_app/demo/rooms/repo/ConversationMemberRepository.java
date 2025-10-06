package com.message_app.demo.rooms.repo;

import com.message_app.demo.rooms.domain.ConversationMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
public interface ConversationMemberRepository extends JpaRepository<ConversationMember, Long> {
    boolean existsByConversation_IdAndUsername(Long conversationId, String username);
    boolean existsByUsernameIgnoreCase(String username);

    @Query("""
     select cm.conversation.id
     from ConversationMember cm
     where cm.username in (:a, :b)
     group by cm.conversation.id
     having count(distinct cm.username) = 2
  """)
    Optional<Long> findDmConversationId(@Param("a") String a, @Param("b") String b);
}

