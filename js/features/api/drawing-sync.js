
import { Client } from "@stomp/stompjs";

let stompClient = null;
let drawingSubscription = null;
let snapshotSubscription = null;
let currentRoomId = null;
let presenceSubscription = null;


// Connect to a drawing room.
export function connectDrawingRoom(
    roomId,
    onDrawingReceived,
    username,
    onPresenceReceived
) {

    currentRoomId = roomId;

    stompClient = new Client({

        brokerURL: "ws://localhost:8080/ws",

        reconnectDelay: 3000,

        // Runs after successful connection.
        onConnect: () => {

            console.log("Connected to drawing room:", roomId);

            // Listen for future drawing updates.
            drawingSubscription = stompClient.subscribe(
                `/topic/rooms/${roomId}/drawing`,
                (frame) => {

                    const message = JSON.parse(frame.body);

                    onDrawingReceived(message);
                }
            );

            // Listen for online-user updates.
presenceSubscription = stompClient.subscribe(
    `/topic/rooms/${roomId}/presence`,
    (frame) => {

        const usernames = JSON.parse(frame.body);

        console.log("[Presence] Online users:", usernames);

        if (onPresenceReceived) {
            onPresenceReceived(usernames);
        }
    }
);

// Tell the backend that this user has joined.
stompClient.publish({
    destination: `/app/rooms/${roomId}/join`,
    body: username || "Guest"
});

            // Request the previous room drawing.
            snapshotSubscription = stompClient.subscribe(
                `/app/rooms/${roomId}/drawing`,
                (frame) => {

                    const message = JSON.parse(frame.body);

                    console.log(
                        "[Collaboration] Previous room drawing received:",
                        message
                    );

                    if (!Array.isArray(message.elements)) {
                        return;
                    }

                    // Ignore an empty initial drawing.
                    if (
                        message.sender === "server" &&
                        message.elements.length === 0
                    ) {
                        return;
                    }

                    onDrawingReceived(message);
                }
            );
        },

        onStompError: (frame) => {
            console.error("STOMP error:", frame.body);
        },

        onWebSocketError: (event) => {
            console.error("WebSocket error:", event);
        }
    });

    // Start the WebSocket connection.
    stompClient.activate();
}


// Send drawing updates to the backend.
export function sendDrawingUpdate(sender, elements) {

    if (!stompClient || !stompClient.connected) {
        console.warn("WebSocket is not connected");
        return;
    }

    stompClient.publish({

        destination: `/app/rooms/${currentRoomId}/drawing`,

        body: JSON.stringify({
            sender: sender,
            elements: elements
        })

    });
}


// Disconnect from the drawing room.
export async function disconnectDrawingRoom() {

    if (drawingSubscription) {
        drawingSubscription.unsubscribe();
        drawingSubscription = null;
    }

    if (snapshotSubscription) {
        snapshotSubscription.unsubscribe();
        snapshotSubscription = null;
    }

    if (stompClient) {
        await stompClient.deactivate();
        stompClient = null;
    }

    currentRoomId = null;
}
