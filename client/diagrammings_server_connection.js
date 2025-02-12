import { clearCanvas, generateCanvasElementsFromCanvasState, removeDisconnectedClientCursor, renderRemoteCursors } from "./script.js";

export const socket = new WebSocket("ws://localhost:8080/diagrammings/canvas");

let receivedChunks = [];
let totalExpectedChunks = null;

socket.onopen = () => {
    console.log("Connected to WebSocket server");
};

socket.onmessage = (event) => {
    const message = JSON.parse(event.data);

    if (message.type === "chunk") {
        receivedChunks.push(message.data);

        if (totalExpectedChunks === null) {
            totalExpectedChunks = message.totalChunks;
        }

        if (receivedChunks.length === totalExpectedChunks) {
            const completeJsonString = receivedChunks.join("");
            const canvasState = JSON.parse(completeJsonString);

            clearCanvas();
            generateCanvasElementsFromCanvasState(canvasState);

            receivedChunks = [];
            totalExpectedChunks = null;
        }
    }

    if (message.type === "cursorData") {
        renderRemoteCursors(message.objects);
    }

    if (message.type === "disconnect") {
        removeDisconnectedClientCursor(message.objects);
    }
};


socket.onclose = function (event) {
    console.log('WebSocket closed:', event);
};

socket.onerror = function (event) {
    console.error('WebSocket error:', event);
};