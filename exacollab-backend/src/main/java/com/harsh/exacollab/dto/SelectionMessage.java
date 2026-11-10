package com.harsh.exacollab.dto;

import java.util.List;

public class SelectionMessage {

    private String sender;

    private String sessionId;

    private List<String> selectedElementIds;

    private List<String> editingElementIds;

    private String clientId;

    public SelectionMessage() {
    }

    public String getSender() {
        return sender;
    }

    public void setSender(String sender) {
        this.sender = sender;
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public List<String> getSelectedElementIds() {
        return selectedElementIds;
    }

    public void setSelectedElementIds(List<String> selectedElementIds) {
        this.selectedElementIds = selectedElementIds;
    }

    public List<String> getEditingElementIds() {
        return editingElementIds;
    }

    public void setEditingElementIds(List<String> editingElementIds) {
        this.editingElementIds = editingElementIds;
    }

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }
}