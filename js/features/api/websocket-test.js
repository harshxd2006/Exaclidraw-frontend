import { Client } from "@stomp/stompjs";

const statusEl = document.getElementById("status");
const roomEl = document.getElementById("roomId");
const senderEl = document.getElementById("sender");
const messageInput = document.getElementById("messageInput");
const messagesEl = document.getElementById("messages");

const connectBtn = document.getElementById("connectBtn");
const disconnectBtn = document.getElementById("disconnectBtn");
const sendBtn = document.getElementById("sendBtn");

let client = null;
let subscription = null;
let connectedRoomId = "";

// Connect to the Spring Boot WebSocket server.
connectBtn.addEventListener("click", () => {
    const roomId = roomEl.value.trim();

    if (!roomId) {
        statusEl.textContent = "Please enter a room ID";
        return;
    }

    client = new Client({
        brokerURL: "ws://localhost:8080/ws",

        onConnect: () => {
            connectedRoomId = roomId;

            statusEl.textContent = `Connected to ${roomId}`;

            connectBtn.disabled = true;
            disconnectBtn.disabled = false;
            sendBtn.disabled = false;

            // Listen for messages sent to this room.
            subscription = client.subscribe(
                `/topic/rooms/${roomId}`,
                (frame) => {
                    const message = JSON.parse(frame.body);

                    const messageItem = document.createElement("p");

                    messageItem.textContent =
                        `${message.sender}: ${message.content}`;

                    messagesEl.appendChild(messageItem);
                }
            );
        },

        onStompError: (frame) => {
            console.error("STOMP error:", frame.headers["message"]);
            console.error(frame.body);

            statusEl.textContent = "STOMP error";
        },

        onWebSocketError: (event) => {
            console.error("WebSocket error:", event);
            statusEl.textContent = "WebSocket connection error";
        },

        onWebSocketClose: () => {
            statusEl.textContent = "Connection closed";

            connectBtn.disabled = false;
            disconnectBtn.disabled = true;
            sendBtn.disabled = true;

            subscription = null;
        }
    });

    statusEl.textContent = "Connecting...";
    client.activate();
});

// Send a message to the connected room.
sendBtn.addEventListener("click", () => {
    if (!client || !client.connected) {
        statusEl.textContent = "Not connected";
        return;
    }

    const content = messageInput.value.trim();

    if (!content) {
        return;
    }

    const message = {
        sender: senderEl.value.trim() || "Anonymous",
        content: content
    };

    client.publish({
        destination: `/app/rooms/${connectedRoomId}/message`,
        body: JSON.stringify(message)
    });

    messageInput.value = "";
});

// Disconnect from the server.
disconnectBtn.addEventListener("click", async () => {
    if (subscription) {
        subscription.unsubscribe();
        subscription = null;
    }

    if (client) {
        await client.deactivate();
        client = null;
    }

    connectedRoomId = "";
    statusEl.textContent = "Disconnected";

    connectBtn.disabled = false;
    disconnectBtn.disabled = true;
    sendBtn.disabled = true;
});