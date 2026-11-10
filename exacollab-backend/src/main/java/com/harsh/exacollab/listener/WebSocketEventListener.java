package com.harsh.exacollab.listener;

import com.harsh.exacollab.service.RoomPresenceService;
import com.harsh.exacollab.service.RoomLockService;

import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Component
public class WebSocketEventListener {

    private final RoomPresenceService roomPresenceService;
    private final RoomLockService roomLockService;

    public WebSocketEventListener(
        RoomPresenceService roomPresenceService,
        RoomLockService roomLockService) {

    this.roomPresenceService = roomPresenceService;
    this.roomLockService = roomLockService;
}

    // Executes when a WebSocket connection disconnects.
    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {

        String sessionId = event.getSessionId();

        System.out.println(
        "[Presence] Disconnect detected: " + sessionId
    );


        // Release all collaborative locks owned by this session.
        roomLockService.releaseLocksForSession(sessionId);

        // Remove the user from room presence.
        roomPresenceService.removeUser(sessionId);
    }
}