package com.harsh.exacollab.service;

import com.harsh.exacollab.dto.DrawingSyncMessage;
import com.harsh.exacollab.entity.RoomState;
import com.harsh.exacollab.repository.RoomStateRepository;

import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.Optional;

@Service
public class RoomStateService {

    private final RoomStateRepository roomStateRepository;

    // Constructor injection
    public RoomStateService(RoomStateRepository roomStateRepository) {
        this.roomStateRepository = roomStateRepository;
    }

    // Save the latest drawing of a room.
    public RoomState saveRoomState(
            String roomId,
            DrawingSyncMessage message) {

        RoomState roomState = new RoomState();

        roomState.setRoomId(roomId);
        roomState.setSender(message.getSender());
        roomState.setElements(message.getElements());
        roomState.setUpdatedAt(OffsetDateTime.now());

        return roomStateRepository.save(roomState);
    }

    // Retrieve a room's saved drawing.
    public Optional<RoomState> getRoomState(String roomId) {

        return roomStateRepository.findById(roomId);
    }
}