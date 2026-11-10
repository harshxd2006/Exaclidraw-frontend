
import { Client } from "@stomp/stompjs";

let stompClient = null;
let drawingSubscription = null;
let snapshotSubscription = null;
let currentRoomId = null;
let presenceSubscription = null;
let cursorSubscription = null;
let cursorLeftSubscription = null;
let deltaSubscription = null;
let selectionSubscription = null;
let lockSubscription = null;


// Connect to a drawing room.
export function connectDrawingRoom(
    roomId,
    onDrawingReceived,
    username,
    onPresenceReceived,
    onCursorReceived,
    onCursorLeft,
    onDrawingDeltaReceived,
     onSelectionReceived,
     onLockUpdate
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

        // Listen for cursor movements from other users.
    cursorSubscription = stompClient.subscribe(
        `/topic/rooms/${roomId}/cursor`,
        (frame) => {

            const cursorMessage = JSON.parse(frame.body);

            

            if (onCursorReceived) {
                onCursorReceived(cursorMessage);
            }
        }
    );

            // Receive individual drawing changes from the backend.
        deltaSubscription = stompClient.subscribe(
            `/topic/rooms/${roomId}/drawing-delta`,
            (frame) => {

                const message = JSON.parse(frame.body);

                if (onDrawingDeltaReceived) {
                    onDrawingDeltaReceived(message);
                }
            }
        );

        // Receive selection updates from other collaborators.
        selectionSubscription = stompClient.subscribe(
            `/topic/rooms/${roomId}/selection`,
            (frame) => {

                const message = JSON.parse(frame.body);

                if (onSelectionReceived) {
                    onSelectionReceived(message);
                }
            }
        );

        // Receive collaborative lock updates.
            lockSubscription = stompClient.subscribe(
                `/topic/rooms/${roomId}/locks`,
                (frame) => {

                    const message = JSON.parse(frame.body);

                    console.log("[Collaboration] Lock update received:", message);

                    if (onLockUpdate) {
                        onLockUpdate(message);
                    }
                }
            );

            // Listen when another user's cursor leaves the room.
        cursorLeftSubscription = stompClient.subscribe(
            `/topic/rooms/${roomId}/cursor-left`,
            (frame) => {

                const disconnectedSessionId = frame.body;

                console.log(
                    "[Cursor] Disconnected session:",
                    disconnectedSessionId
                );

                if (onCursorLeft) {
                    onCursorLeft(disconnectedSessionId);
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

    


// Send individual drawing changes to the backend.
export function sendDrawingDelta(
    sender,
    upsertedElements = [],
    deletedElementVersions = {}
) {

    if (!stompClient || !stompClient.connected) {
        console.warn("WebSocket is not connected");
        return;
    }

    stompClient.publish({

        destination: `/app/rooms/${currentRoomId}/drawing-delta`,

        body: JSON.stringify({
            sender: sender,
            upsertedElements: upsertedElements,
            deletedElementVersions: deletedElementVersions
        })

    });
}


export async function disconnectDrawingRoom() {

    // Unsubscribe from all room subscriptions.
    if (drawingSubscription) {
        drawingSubscription.unsubscribe();
        drawingSubscription = null;
    }

    if (snapshotSubscription) {
        snapshotSubscription.unsubscribe();
        snapshotSubscription = null;
    }

    if (presenceSubscription) {
        presenceSubscription.unsubscribe();
        presenceSubscription = null;
    }

    if (cursorSubscription) {
        cursorSubscription.unsubscribe();
        cursorSubscription = null;
    }

    if (cursorLeftSubscription) {
        cursorLeftSubscription.unsubscribe();
        cursorLeftSubscription = null;
    }

    if (deltaSubscription) {
        deltaSubscription.unsubscribe();
        deltaSubscription = null;
    }

        // Clean up selection subscription.
    if (selectionSubscription) {
        selectionSubscription.unsubscribe();
        selectionSubscription = null;
    }

    // Clean up collaborative lock subscription.
    if (lockSubscription) {
        lockSubscription.unsubscribe();
        lockSubscription = null;
    }

    // Disconnect the WebSocket connection.
    if (stompClient) {
        await stompClient.deactivate();
        stompClient = null;
    }

    currentRoomId = null;
}

// Send selection updates to other collaborators.
export function sendSelectionUpdate(
    sender,
    clientId,
    selectedElementIds,
    editingElementIds = undefined
) {
    if (!stompClient || !stompClient.connected) {
        return;
    }

    const message = {
        sender: sender,
        clientId: clientId,
        selectedElementIds: selectedElementIds
    };

    // Include editing information only when explicitly provided.
    if (editingElementIds !== undefined) {
        message.editingElementIds = editingElementIds;
    }

    stompClient.publish({
        destination: `/app/rooms/${currentRoomId}/selection`,
        body: JSON.stringify(message)
    });
}


// Send the current user's cursor position.
export function sendCursorUpdate(sender, cursorId, x, y) {

    if (!stompClient || !stompClient.connected) {
        return;
    }

    stompClient.publish({

        destination: `/app/rooms/${currentRoomId}/cursor`,

        body: JSON.stringify({
            sender: sender,
            cursorId: cursorId,
            x: x,
            y: y
        })

    });
}

// Request ownership of an element lock.
export function requestElementLock(elementId, username,clientId) {

    if (!stompClient || !stompClient.connected) {
        console.warn("[Lock] Cannot request lock: WebSocket disconnected");
        return false;
    }

    stompClient.publish({
        destination: `/app/rooms/${currentRoomId}/lock`,

        body: JSON.stringify({
            elementId: elementId,
            username: username,
            clientId: clientId
        })
    });

    return true;
}


// Release an element lock owned by this session.
export function releaseElementLock(elementId) {

    if (!stompClient || !stompClient.connected) {
        console.warn("[Lock] Cannot release lock: WebSocket disconnected");
        return false;
    }

    stompClient.publish({
        destination: `/app/rooms/${currentRoomId}/unlock`,

        body: JSON.stringify({
            elementId: elementId
        })
    });

    return true;
}