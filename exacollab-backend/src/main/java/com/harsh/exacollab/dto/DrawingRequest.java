package com.harsh.exacollab.dto;

import java.util.Map;

import jakarta.validation.constraints.NotBlank;

public class DrawingRequest {

   @NotBlank(message = "Drawing title is required")
    private String title;

    private Map<String, Object> sceneData;

    public DrawingRequest() {
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public Map<String, Object> getSceneData() {
        return sceneData;
    }

    public void setSceneData(Map<String, Object> sceneData) {
        this.sceneData = sceneData;
    }
}