package com.harsh.exacollab.service;

import org.springframework.stereotype.Service;
import java.util.List;
import com.harsh.exacollab.dto.DrawingRequest;
import com.harsh.exacollab.entity.Drawing;
import com.harsh.exacollab.repository.DrawingRepository;

import java.util.Optional;
import java.util.UUID;

@Service
public class DrawingService {

    private final DrawingRepository drawingRepository;

    public DrawingService(DrawingRepository drawingRepository) {
        this.drawingRepository = drawingRepository;
    }

    public Drawing saveDrawing(DrawingRequest request) {

        Drawing drawing = new Drawing();

        drawing.setTitle(request.getTitle());
        drawing.setSceneData(request.getSceneData());

        return drawingRepository.save(drawing);
    }

    public Optional<Drawing> getDrawingById(UUID id) {
    return drawingRepository.findById(id);
}

    public DrawingRequest processDrawing(DrawingRequest request) {
        return request;
    }

    public Optional<Drawing> updateDrawing(
        UUID id, DrawingRequest request) {

    Optional<Drawing> existingDrawing =
            drawingRepository.findById(id);

    if (existingDrawing.isEmpty()) {
        return Optional.empty();
    }

    Drawing drawing = existingDrawing.get();

    drawing.setTitle(request.getTitle());
    drawing.setSceneData(request.getSceneData());

    Drawing updatedDrawing = drawingRepository.save(drawing);

    return Optional.of(updatedDrawing);
}

public boolean deleteDrawing(UUID id) {

    if (!drawingRepository.existsById(id)) {
        return false;
    }

    drawingRepository.deleteById(id);

    return true;
}

public List<Drawing> getAllDrawings() {
    return drawingRepository.findAll();
}
}