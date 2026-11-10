package com.harsh.exacollab.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RoomLockService {

    private final SimpMessagingTemplate messagingTemplate;
    

    // Stores collaborative locks, separated by room.
    private final Map<String, Map<String, ElementLock>> roomLocks =
            new ConcurrentHashMap<>();

    public RoomLockService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    // Try to acquire a collaborative lock on an element.
public boolean tryAcquireLock(
        String roomId,
        String elementId,
        String sessionId,
        String username,
        String clientId) {

    if (roomId == null || roomId.isBlank()
            || elementId == null || elementId.isBlank()
            || sessionId == null || sessionId.isBlank()) {
        return false;
    }

    // Get the lock map for this room.
    Map<String, ElementLock> locks = roomLocks.computeIfAbsent(
            roomId,
            key -> new ConcurrentHashMap<>()
    );

    String safeUsername =
            username == null || username.isBlank()
                    ? "Guest"
                    : username.trim();

    // Try to acquire the lock atomically.
    ElementLock newLock = new ElementLock(sessionId, safeUsername,clientId);

    ElementLock existingLock = locks.putIfAbsent(elementId, newLock);

    // Another session already owns this lock.
    if (existingLock != null) {

        // Allow the same session to request its own lock again.
        return existingLock.sessionId.equals(sessionId);
    }

    // Notify everyone in the room that this element is locked.
   messagingTemplate.convertAndSend(
        "/topic/rooms/" + roomId + "/locks",
        (Object) Map.of(
                "action", "LOCKED",
                "elementId", elementId,
                "sessionId", sessionId,
                "username", safeUsername,
                "clientId", clientId
        )
);

    return true;
}

// Release a collaborative lock owned by a specific session.
public boolean releaseLock(
        String roomId,
        String elementId,
        String sessionId) {

    // Find the locks belonging to this room.
    Map<String, ElementLock> locks = roomLocks.get(roomId);

    if (locks == null) {
        return false;
    }

    // Find the current owner of this element's lock.
    ElementLock existingLock = locks.get(elementId);

    if (existingLock == null) {
        return false;
    }

    // Only the session that acquired the lock can release it.
    if (!existingLock.sessionId.equals(sessionId)) {
        return false;
    }

    // Remove the lock only if it is still owned by this session.
    if (!locks.remove(elementId, existingLock)) {
        return false;
    }

    // Notify everyone that the element is unlocked.
    messagingTemplate.convertAndSend(
            "/topic/rooms/" + roomId + "/locks",
           (Object) Map.of(
                    "action", "UNLOCKED",
                    "elementId", elementId,
                    "sessionId", sessionId,
                    "username", existingLock.username
            )
    );

    // Remove the room's lock map if it is empty.
    if (locks.isEmpty()) {
        roomLocks.remove(roomId, locks);
    }

    return true;
}

// Check whether a WebSocket session owns an element lock.
public boolean ownsLock(
        String roomId,
        String elementId,
        String sessionId) {

    Map<String, ElementLock> locks = roomLocks.get(roomId);

    if (locks == null) {
        return false;
    }

    ElementLock lock = locks.get(elementId);

    if (lock == null) {
        return false;
    }

    return lock.sessionId.equals(sessionId);
}

// Release every collaborative lock owned by a disconnected session.
public void releaseLocksForSession(String sessionId) {

    if (sessionId == null || sessionId.isBlank()) {
        return;
    }

    // Check every room.
    for (Map.Entry<String, Map<String, ElementLock>> roomEntry
            : roomLocks.entrySet()) {

        String roomId = roomEntry.getKey();

        Map<String, ElementLock> locks = roomEntry.getValue();

        // Find locks owned by this disconnected session.
        for (Map.Entry<String, ElementLock> lockEntry
                : locks.entrySet()) {

            String elementId = lockEntry.getKey();

            ElementLock lock = lockEntry.getValue();

            if (lock.sessionId.equals(sessionId)) {

                // Remove only if the lock still belongs to this session.
                if (locks.remove(elementId, lock)) {

                    messagingTemplate.convertAndSend(
                            "/topic/rooms/" + roomId + "/locks",
                            (Object)Map.of(
                                    "action", "UNLOCKED",
                                    "elementId", elementId,
                                    "sessionId", sessionId,
                                    "username", lock.username
                            )
                    );
                }
            }
        }

        // Remove the room entry if no locks remain.
        if (locks.isEmpty()) {
            roomLocks.remove(roomId, locks);
        }
    }
}

    // Information about the collaborator who owns a lock.
    private static class ElementLock {

        private final String sessionId;
        private final String username;
        private final String clientId;

        public ElementLock(String sessionId, String username, String clientId) {
            this.sessionId = sessionId;
            this.username = username;
            this.clientId=clientId;
        }
    }
}