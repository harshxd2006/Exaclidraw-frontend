package com.harsh.exacollab.controller;

import com.harsh.exacollab.dto.CollaborationMessage;
import com.harsh.exacollab.dto.DrawingSyncMessage;


import com.harsh.exacollab.entity.RoomState;
import com.harsh.exacollab.dto.CursorMessage;

import org.springframework.messaging.simp.annotation.SubscribeMapping;
import java.util.List;
import com.harsh.exacollab.service.RoomStateService;
import com.harsh.exacollab.dto.DrawingDeltaMessage;

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

   public CollaborationController(
        SimpMessagingTemplate messagingTemplate,
        RoomStateService roomStateService,
        RoomPresenceService roomPresenceService) {

    this.messagingTemplate = messagingTemplate;
    this.roomStateService = roomStateService;
    this.roomPresenceService = roomPresenceService;
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

    
        

// Receives individual drawing changes from collaborators.
@MessageMapping("/rooms/{roomId}/drawing-delta")
public void syncDrawingDelta(
        @DestinationVariable String roomId,
        DrawingDeltaMessage message) {

    // Merge changes and reject outdated updates.
    DrawingDeltaMessage acceptedMessage =
            roomStateService.mergeRoomDelta(roomId, message);

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