package com.harsh.exacollab.controller;

import com.harsh.exacollab.dto.DrawingRequest;
import com.harsh.exacollab.service.DrawingService;

import com.harsh.exacollab.entity.Drawing;
import org.springframework.http.HttpStatus;
import java.util.List;



import jakarta.validation.Valid;

import java.util.Map;
import org.springframework.http.ResponseEntity;

import java.util.Optional;
import java.util.UUID;

import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class DrawingController {
    private final DrawingService drawingService;

public DrawingController(DrawingService drawingService) {
    this.drawingService = drawingService;
}

    @PostMapping("/api/drawings")
    public ResponseEntity<?> receiveDrawing(
        @Valid @RequestBody DrawingRequest request) {

    if (request.getTitle() == null
            || request.getTitle().isBlank()) {

        return ResponseEntity.badRequest().body(
                Map.of("error", "Drawing title is required")   // never receieves data blindly from the frontend
        );
    }

    if (request.getSceneData() == null) {
        return ResponseEntity.badRequest().body(
                Map.of("error", "Drawing data is required")
        );
    }

    Drawing savedDrawing = drawingService.saveDrawing(request);

return ResponseEntity
        .status(HttpStatus.CREATED)
        .body(savedDrawing);
}
@GetMapping("/api/drawings/{id}")
public ResponseEntity<Drawing> getDrawingById(
        @PathVariable UUID id) {

    Optional<Drawing> drawing =
            drawingService.getDrawingById(id);

    if (drawing.isEmpty()) {
        return ResponseEntity.notFound().build();
    }

    return ResponseEntity.ok(drawing.get());
}

@PutMapping("/api/drawings/{id}")
public ResponseEntity<?> updateDrawing(
        @PathVariable UUID id,
        @Valid @RequestBody DrawingRequest request) {

    if (request.getSceneData() == null) {
        return ResponseEntity.badRequest().body(
                Map.of("error", "Drawing data is required")
        );
    }

    Optional<Drawing> updatedDrawing =
            drawingService.updateDrawing(id, request);

    if (updatedDrawing.isEmpty()) {
        return ResponseEntity.notFound().build();
    }

    return ResponseEntity.ok(updatedDrawing.get());
}

@DeleteMapping("/api/drawings/{id}")
public ResponseEntity<Void> deleteDrawing(
        @PathVariable UUID id) {

    boolean deleted = drawingService.deleteDrawing(id);

    if (!deleted) {
        return ResponseEntity.notFound().build();
    }

    return ResponseEntity.noContent().build();
}

@GetMapping("/api/drawings")
public ResponseEntity<List<Drawing>> getAllDrawings() {

    List<Drawing> drawings = drawingService.getAllDrawings();

    return ResponseEntity.ok(drawings);
}

}