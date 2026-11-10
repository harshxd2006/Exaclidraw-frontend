package com.harsh.exacollab.dto;

public class ElementLockMessage {

    private String elementId;
    private String username;
    private String clientId;

    public ElementLockMessage() {
    }

    public String getElementId() {
        return elementId;
    }

    public void setElementId(String elementId) {
        this.elementId = elementId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getClientId() {
    return clientId;
}

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }
}