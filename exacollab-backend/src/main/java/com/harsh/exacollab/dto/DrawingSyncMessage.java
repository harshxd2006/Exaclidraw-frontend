package com.harsh.exacollab.dto;

import java.util.List;
import java.util.Map;

public class DrawingSyncMessage {

    private String sender;
    private List<Map<String, Object>> elements;

    public DrawingSyncMessage() {
    }

    public String getSender() {
        return sender;
    }

    public void setSender(String sender) {
        this.sender = sender;
    }

    public List<Map<String, Object>> getElements() {
        return elements;
    }

    public void setElements(List<Map<String, Object>> elements) {
        this.elements = elements;
    }
}