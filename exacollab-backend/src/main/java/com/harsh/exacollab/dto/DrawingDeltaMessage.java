package com.harsh.exacollab.dto;

import java.util.List;
import java.util.Map;

public class DrawingDeltaMessage {

    private String sender;

    private List<Map<String, Object>> upsertedElements;

   private Map<String, Long> deletedElementVersions;

    public DrawingDeltaMessage() {
    }

    public String getSender() {
        return sender;
    }

    public void setSender(String sender) {
        this.sender = sender;
    }

    public List<Map<String, Object>> getUpsertedElements() {
        return upsertedElements;
    }

    public void setUpsertedElements(List<Map<String, Object>> upsertedElements) {
        this.upsertedElements = upsertedElements;
    }

    public Map<String, Long> getDeletedElementVersions() {
    return deletedElementVersions;
}

public void setDeletedElementVersions(Map<String, Long> deletedElementVersions) {
    this.deletedElementVersions = deletedElementVersions;
}

}