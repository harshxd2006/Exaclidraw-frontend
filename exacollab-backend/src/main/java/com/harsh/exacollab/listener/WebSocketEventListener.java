package com.harsh.exacollab.listener;

import com.harsh.exacollab.service.RoomPresenceService;

import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Component
public class WebSocketEventListener {

    private final RoomPresenceService roomPresenceService;

    public WebSocketEventListener(
            RoomPresenceService roomPresenceService) {
        this.roomPresenceService = roomPresenceService;
    }

    // Executes when a WebSocket connection disconnects.
    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {

        String sessionId = event.getSessionId();

        System.out.println(
        "[Presence] Disconnect detected: " + sessionId
    );


        // Remove the disconnected user from their room.
        roomPresenceService.removeUser(sessionId);
    }
}