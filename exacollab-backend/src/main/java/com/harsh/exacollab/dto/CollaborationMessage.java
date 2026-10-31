package com.harsh.exacollab.dto;

public class CollaborationMessage {

    private String sender;
    private String content;

    public CollaborationMessage() {
    }

    public String getSender() {
        return sender;
    }

    public void setSender(String sender) {
        this.sender = sender;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }
}