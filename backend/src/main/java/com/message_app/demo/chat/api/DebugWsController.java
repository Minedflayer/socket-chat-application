package com.message_app.demo.chat.api;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;

import java.security.Principal;

/*@Controller
public class DebugWsController {
    private static final Logger log = LoggerFactory.getLogger(DebugWsController.class);

    @MessageMapping("/whoami")
    @SendToUser("/queue/whoami")
    public String whoami(Principal principal,
                         @Header("simpSessionId") String sid,
                         org.springframework.messaging.Message<?> message) {
        Principal viaHeader = SimpMessageHeaderAccessor.getUser(message.getHeaders());

        log.warn("WHOAMI handler: sid={} argPrincipal={} type={} name={}",
                sid,
                principal,
                (principal == null ? null : principal.getClass().getName()),
                (principal == null ? null : principal.getName()));

        log.warn("WHOAMI handler: viaHeaderPrincipal={} type={} name={}",
                viaHeader,
                (viaHeader == null ? null : viaHeader.getClass().getName()),
                (viaHeader == null ? null : viaHeader.getName()));

        return principal != null ? principal.getName() : "<null>";
    }
}*/

