import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

// WebSocket URL and client setup
const socket = new SockJS('http://localhost:8080/ws');
const stompClient = new Client({
    webSocketFactory: () => socket,
    reconnectDelay: 5000, // Auto-reconnect after 5 seconds
});

stompClient.onConnect = (frame) => {
    console.log('Connected: ' + frame);

    // Subscribe to canvas updates
    stompClient.subscribe('/topic/updates', (message) => {
        const updateData = JSON.parse(message.body);
        console.log('Received update:', updateData);

        // Apply updates to fabric.js canvas
        updateCanvas(updateData);
    });
};

stompClient.activate();

// Function to send updates to the server
function sendCanvasUpdate(update) {
    const data = JSON.stringify(update);
    stompClient.publish({ destination: '/app/update', body: data });
}

// Example: fabric.js integration
const canvas = new fabric.Canvas('canvas');

// Send canvas updates on object modifications
canvas.on('object:modified', () => {
    const json = canvas.toJSON();
    sendCanvasUpdate(json);
});

// Function to update the canvas with received data
function updateCanvas(updateData) {
    canvas.loadFromJSON(updateData, canvas.renderAll.bind(canvas));
}