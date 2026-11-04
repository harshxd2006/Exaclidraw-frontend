package com.harsh.exacollab.dto;

public class CursorMessage {

    private String sender;
    private String cursorId;
    private String sessionId;

    private double x;
    private double y;

    public CursorMessage() {
    }

    public String getSender() {
        return sender;
    }

    public void setSender(String sender) {
        this.sender = sender;
    }

    public String getCursorId() {

        return cursorId;
    }


    public void setCursorId(String cursorId) {
        this.cursorId = cursorId;
    }

    public double getX() {
        return x;
    }

    public void setX(double x) {
        this.x = x;
    }

    public double getY() {
        return y;
    }

    public void setY(double y) {
        this.y = y;
    }

    public String getSessionId() {
    return sessionId;
}

public void setSessionId(String sessionId) {
    this.sessionId = sessionId;
}
}