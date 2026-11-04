package com.harsh.exacollab.repository;

import com.harsh.exacollab.entity.RoomState;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface RoomStateRepository extends JpaRepository<RoomState, String> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM RoomState r WHERE r.roomId = :roomId")
    Optional<RoomState> findByRoomIdForUpdate(
            @Param("roomId") String roomId
    );

    @Modifying
    @Query(value = """
        INSERT INTO room_states (room_id, sender, elements, updated_at)
        VALUES (:roomId, 'system', '[]'::jsonb, CURRENT_TIMESTAMP)
        ON CONFLICT (room_id) DO NOTHING
        """, nativeQuery = true)
    void createIfMissing(@Param("roomId") String roomId);
}