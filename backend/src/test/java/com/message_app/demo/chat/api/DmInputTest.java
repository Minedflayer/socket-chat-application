package com.message_app.demo.chat.api;

import jakarta.validation.Valid;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import java.security.Principal;
import static org.junit.jupiter.api.Assertions.*;

class DmInputTest {
    @Test
    void trimsContentBeforeValidationAndStorage() {
        assertEquals("hello", new DmWebSocketController.ChatIn("  hello \n").content());
    }

    @Test
    void rejectsBlankAndOverlongContentButAcceptsTheStorageBoundary() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            for (String content : new String[]{null, "", " \n\t", "x".repeat(2001)}) {
                assertFalse(validator.validate(new DmWebSocketController.ChatIn(content)).isEmpty());
            }
            assertTrue(validator.validate(new DmWebSocketController.ChatIn("x".repeat(2000))).isEmpty());
        }
    }

    @Test
    void stompSendRequestsActivatePayloadValidation() throws Exception {
        var method = DmWebSocketController.class.getMethod("send", String.class,
                DmWebSocketController.ChatIn.class, Principal.class);
        assertTrue(method.getParameters()[1].isAnnotationPresent(Valid.class));
    }
}
