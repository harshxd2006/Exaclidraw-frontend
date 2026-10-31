package com.harsh.exacollab.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RoomPresenceService {

    private final SimpMessagingTemplate messagingTemplate;

    // Stores users currently present in each room.
    private final Map<String, Map<String, String>> roomUsers =
            new ConcurrentHashMap<>();

    // Remembers which room each connection belongs to.
    private final Map<String, String> sessionRooms =
            new ConcurrentHashMap<>();

    public RoomPresenceService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    // Register a user when they join a room.
public void addUser(String roomId, String sessionId, String username) {

    // Get the room's user map, or create one if it doesn't exist.
    Map<String, String> users = roomUsers.computeIfAbsent(
            roomId,
            key -> new ConcurrentHashMap<>()
    );

    // Store this user's session ID and display name.
    users.put(sessionId, username);

    // Remember which room this session belongs to.
    sessionRooms.put(sessionId, roomId);

    // Notify everyone in the room about the updated user list.
    broadcastUsers(roomId);
}


// Broadcast the current list of users in a room.
private void broadcastUsers(String roomId) {

    Map<String, String> users = roomUsers.get(roomId);

    List<String> usernames = users == null
            ? List.of()
            : List.copyOf(users.values());

    messagingTemplate.convertAndSend(
            "/topic/rooms/" + roomId + "/presence",
            usernames
    );
}

// Remove a user when their WebSocket session disconnects.
public void removeUser(String sessionId) {

    // Find which room this session belongs to.
    String roomId = sessionRooms.remove(sessionId);

    // If the session wasn't registered, stop here.
    if (roomId == null) {
        return;
    }

    // Get the users of that room.
    Map<String, String> users = roomUsers.get(roomId);

    if (users == null) {
        return;
    }

    // Remove this particular session.
    users.remove(sessionId);

    // If nobody remains, remove the room from memory.
    if (users.isEmpty()) {
        roomUsers.remove(roomId, users);
    }

    // Send the updated user list to everyone remaining.
    broadcastUsers(roomId);
}

}