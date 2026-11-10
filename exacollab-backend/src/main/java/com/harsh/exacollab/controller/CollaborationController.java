package com.harsh.exacollab.controller;

import com.harsh.exacollab.dto.CollaborationMessage;
import com.harsh.exacollab.dto.DrawingSyncMessage;


import com.harsh.exacollab.entity.RoomState;
import com.harsh.exacollab.dto.CursorMessage;
import com.harsh.exacollab.dto.SelectionMessage;
import com.harsh.exacollab.service.RoomLockService;

import org.springframework.messaging.simp.annotation.SubscribeMapping;
import java.util.List;
import com.harsh.exacollab.service.RoomStateService;
import com.harsh.exacollab.dto.DrawingDeltaMessage;

import com.harsh.exacollab.dto.ElementLockMessage;
import java.util.Map;

import com.harsh.exacollab.service.RoomPresenceService;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.stereotype.Controller;

@Controller
public class CollaborationController {

    private final SimpMessagingTemplate messagingTemplate;

    private final RoomStateService roomStateService;

    private final RoomPresenceService roomPresenceService;

    private final RoomLockService roomLockService;

   public CollaborationController(
        SimpMessagingTemplate messagingTemplate,
        RoomStateService roomStateService,
        RoomPresenceService roomPresenceService,
        RoomLockService roomLockService) {

    this.messagingTemplate = messagingTemplate;
    this.roomStateService = roomStateService;
    this.roomPresenceService = roomPresenceService;
    this.roomLockService = roomLockService;
}

    @MessageMapping("/rooms/{roomId}/message")  // This specifies which incoming STOMP messages should be handled by our method.
    public void sendMessage(
            @DestinationVariable String roomId,
            CollaborationMessage message) {

        messagingTemplate.convertAndSend(
                "/topic/rooms/" + roomId,
                message
        );
    }

    
        

@MessageMapping("/rooms/{roomId}/drawing-delta")
public void syncDrawingDelta(
        @DestinationVariable String roomId,
        @Header("simpSessionId") String sessionId,
        @Payload DrawingDeltaMessage message) {

    // Merge changes and reject outdated updates.
    DrawingDeltaMessage acceptedMessage =
        roomStateService.mergeRoomDelta(roomId, sessionId, message);

    // Broadcast only the changes accepted by the backend.
    messagingTemplate.convertAndSend(
            "/topic/rooms/" + roomId + "/drawing-delta",
            acceptedMessage
    );
}

    @MessageMapping("/rooms/{roomId}/cursor")
public void syncCursor(
        @DestinationVariable String roomId,
        @Header("simpSessionId") String sessionId,
        CursorMessage cursorMessage) {

    // Use the actual WebSocket session as the cursor ID.
        cursorMessage.setSessionId(sessionId);

    messagingTemplate.convertAndSend(
            "/topic/rooms/" + roomId + "/cursor",
            cursorMessage
    );

    
}

// Receive and broadcast collaborator selection updates.
@MessageMapping("/rooms/{roomId}/selection")
public void syncSelection(
        @DestinationVariable String roomId,
        @Header("simpSessionId") String sessionId,
        @Payload SelectionMessage message) {

    // Attach the actual WebSocket session ID.
    message.setSessionId(sessionId);

    // Broadcast selection information to everyone in the room.
    messagingTemplate.convertAndSend(
            "/topic/rooms/" + roomId + "/selection",
            message
    );
}

// Handles requests to lock an element.
@MessageMapping("/rooms/{roomId}/lock")
public void requestElementLock(
        @DestinationVariable String roomId,
        @Header("simpSessionId") String sessionId,
        @Payload ElementLockMessage message) {

    if (message == null || message.getElementId() == null
            || message.getElementId().isBlank()) {
        return;
    }

    // Try to acquire the lock for this WebSocket session.
    boolean acquired = roomLockService.tryAcquireLock(
            roomId,
            message.getElementId(),
            sessionId,
            message.getUsername(),
            message.getClientId()
    );

    // Notify the room if another collaborator owns the lock.
    if (!acquired) {

        messagingTemplate.convertAndSend(
                "/topic/rooms/" + roomId + "/locks",
                (Object)Map.of(
                        "action", "DENIED",
                        "elementId", message.getElementId(),
                        "requesterSessionId", sessionId,
                        "clientId", message.getClientId()
                )
        );
    }
}

// Handles requests to unlock an element.
@MessageMapping("/rooms/{roomId}/unlock")
public void releaseElementLock(
        @DestinationVariable String roomId,
        @Header("simpSessionId") String sessionId,
        @Payload ElementLockMessage message) {

    if (message == null || message.getElementId() == null
            || message.getElementId().isBlank()) {
        return;
    }

    // Only the session that owns the lock can release it.
    roomLockService.releaseLock(
            roomId,
            message.getElementId(),
            sessionId
    );
}






    @SubscribeMapping("/rooms/{roomId}/drawing")
    public DrawingSyncMessage getLatestDrawing(
            @DestinationVariable String roomId) {

        // Retrieve the saved room state from PostgreSQL.
        var savedState = roomStateService.getRoomState(roomId);

        if (savedState.isPresent()) {

            RoomState roomState = savedState.get();

            DrawingSyncMessage message = new DrawingSyncMessage();

            message.setSender(roomState.getSender());
            message.setElements(roomState.getElements());

            return message;
        }

        // Return an empty drawing if the room doesn't exist.
        DrawingSyncMessage emptyDrawing = new DrawingSyncMessage();

        emptyDrawing.setSender("server");
        emptyDrawing.setElements(List.of());

        return emptyDrawing;
    }

    @MessageMapping("/rooms/{roomId}/join")
    public void joinRoom(

        
            @DestinationVariable String roomId,
            @Header("simpSessionId") String sessionId,
            @Payload String username) {

               

        if (username == null || username.isBlank()) {
            username = "Guest";
        }

        // Register the user in the room.
        roomPresenceService.addUser(
                roomId,
                sessionId,
                username.trim()
        );
    }
    }