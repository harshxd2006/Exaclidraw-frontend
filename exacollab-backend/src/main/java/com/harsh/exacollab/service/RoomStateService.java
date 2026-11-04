package com.harsh.exacollab.service;

import com.harsh.exacollab.dto.DrawingDeltaMessage;

import com.harsh.exacollab.entity.RoomState;
import com.harsh.exacollab.repository.RoomStateRepository;

import org.springframework.stereotype.Service;

import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class RoomStateService {

    private final RoomStateRepository roomStateRepository;

    // Constructor injection
    public RoomStateService(RoomStateRepository roomStateRepository) {
        this.roomStateRepository = roomStateRepository;
    }

    
    
    // Retrieve a room's saved drawing.
    public Optional<RoomState> getRoomState(String roomId) {

        return roomStateRepository.findById(roomId);
    }

   @Transactional
public DrawingDeltaMessage mergeRoomDelta(
        String roomId,
        DrawingDeltaMessage message) {

    // 1. Create the room if it doesn't exist.
    roomStateRepository.createIfMissing(roomId);

    // 2. Lock and retrieve the room.
    RoomState roomState = roomStateRepository
            .findByRoomIdForUpdate(roomId)
            .orElseThrow(() ->
                    new IllegalStateException("Room state not found: " + roomId)
            );

    // 3. Prepare existing elements using their IDs.
    Map<String, Map<String, Object>> mergedElements =
            new LinkedHashMap<>();

    if (roomState.getElements() != null) {
        for (Map<String, Object> element : roomState.getElements()) {

            if (element == null || element.get("id") == null) {
                continue;
            }

            String elementId = element.get("id").toString();

            mergedElements.put(elementId, new HashMap<>(element));
        }
    }

    // 4. Copy existing deletion history.
    Map<String, Long> deletionVersions =
            roomState.getDeletedElementVersions() == null
                    ? new HashMap<>()
                    : new HashMap<>(roomState.getDeletedElementVersions());

    // 5. Store only the updates accepted by the backend.
    List<Map<String, Object>> acceptedUpserts = new ArrayList<>();
    Map<String, Long> acceptedDeletions = new HashMap<>();

    // 6. Process incoming elements.
    if (message.getUpsertedElements() != null) {

        for (Map<String, Object> incoming : message.getUpsertedElements()) {

            if (incoming == null || incoming.get("id") == null) {
                continue;
            }

            Object versionValue = incoming.get("version");

            if (!(versionValue instanceof Number)) {
                continue;
            }

            String elementId = incoming.get("id").toString();

            long incomingVersion =
                    ((Number) versionValue).longValue();

            // Find the existing version.
            Map<String, Object> existing = mergedElements.get(elementId);

            long existingVersion = 0;

            if (existing != null && existing.get("version") instanceof Number) {
                existingVersion =
                        ((Number) existing.get("version")).longValue();
            }

            // Find the last recorded deletion version.
            long deletedVersion =
                    deletionVersions.getOrDefault(elementId, 0L);

                        if (incomingVersion <= existingVersion ||
                incomingVersion <= deletedVersion) {

                // Return the latest existing element to collaborators.
                if (existing != null && existingVersion >= deletedVersion) {

                    acceptedUpserts.removeIf(element ->
                            elementId.equals(String.valueOf(element.get("id")))
                    );

                    acceptedUpserts.add(new HashMap<>(existing));

                }
                // If the element was already deleted, return its deletion version.
                else if (deletedVersion > 0) {

                    acceptedDeletions.put(elementId, deletedVersion);

                }

                continue;
            }

            // Accept the newer element.
            Map<String, Object> updated =
                    new HashMap<>(incoming);

            mergedElements.put(elementId, updated);

            acceptedUpserts.add(updated);
        }
    }

   

if (message.getDeletedElementVersions() != null) {

    for (Map.Entry<String, Long> deletion :
            message.getDeletedElementVersions().entrySet()) {

        String elementId = deletion.getKey();
        Long incomingDeletionVersion = deletion.getValue();

        if (elementId == null || incomingDeletionVersion == null) {
            continue;
        }

        // Find the current element.
        Map<String, Object> existing = mergedElements.get(elementId);

        long existingVersion = 0;

        if (existing != null && existing.get("version") instanceof Number) {
            existingVersion =
                    ((Number) existing.get("version")).longValue();
        }

        // Find the previous deletion version.
        long previousDeletionVersion =
                deletionVersions.getOrDefault(elementId, 0L);

        // Reject outdated or duplicate deletions.
        if (incomingDeletionVersion <= existingVersion ||
            incomingDeletionVersion <= previousDeletionVersion) {

            continue;
        }

        // Remove the element and record its deletion version.
        mergedElements.remove(elementId);

        deletionVersions.put(elementId, incomingDeletionVersion);

        acceptedDeletions.put(elementId, incomingDeletionVersion);

        // Don't broadcast an upsert for an element just deleted.
        acceptedUpserts.removeIf(element ->
                elementId.equals(String.valueOf(element.get("id")))
        );
    }
}

    // 8. Update the room state.
    roomState.setElements(new ArrayList<>(mergedElements.values()));
    roomState.setDeletedElementVersions(deletionVersions);
    roomState.setSender(message.getSender());
    roomState.setUpdatedAt(OffsetDateTime.now());

    roomStateRepository.save(roomState);

    // 9. Return only the accepted updates.
    DrawingDeltaMessage acceptedMessage = new DrawingDeltaMessage();

    acceptedMessage.setSender(message.getSender());
    acceptedMessage.setUpsertedElements(acceptedUpserts);
    acceptedMessage.setDeletedElementVersions(acceptedDeletions);

    return acceptedMessage;
}
    
    }