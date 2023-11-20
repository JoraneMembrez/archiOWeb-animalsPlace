import createDebugger from "debug";
import { WebSocketServer } from "ws";

const debug = createDebugger("express-api:messaging");

const clients = [];
let connectedUsers = 0;

export function createWebSocketServer(httpServer) {
  debug("Creating WebSocket server");
  const wss = new WebSocketServer({
    server: httpServer,
  });

  // Handle new client connections.
  wss.on("connection", function (ws) {
    debug("New WebSocket client connected");
    console.log("New WebSocket client connected");

    // Keep track of clients.
    clients.push(ws);

    // Listen for messages sent by clients.
    ws.on("message", (message) => {
      // Make sure the message is valid JSON.
      let parsedMessage;
      try {
        parsedMessage = JSON.parse(message);
      } catch (err) {
        // Send an error message to the client with "ws" if you want...
        return debug("Invalid JSON message received from client");
      }

      // Handle the message.
      onMessageReceived(ws, parsedMessage);
      console.log("message received : ", parsedMessage);

      connectedUsers++;
      broadcastMessage({ connectedUsers: connectedUsers });
    });

    // Clean up disconnected clients.
    ws.on("close", () => {
      clients.splice(clients.indexOf(ws), 1);
      debug("WebSocket client disconnected");
      connectedUsers--;
      broadcastMessage({ connectedUsers: connectedUsers });
    });
  });
}

export function broadcastMessage(message) {
  debug(
    `Broadcasting message to all connected clients: ${JSON.stringify(message)}`
  );

  clients.forEach((c) => c.send(JSON.stringify(message)));
  console.log("un message a été envoyé : ", message);
  console.log("connectedUsers : ", connectedUsers);
}

export function sendMessageToConnectedClient(client, message) {
  debug(`Sending message to a connected client: ${JSON.stringify(message)}`);

  if (client.readyState === client.OPEN) {
    try {
      client.send(JSON.stringify(message));
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }

  console.log("un message a été envoyé : ", message);
}

function onMessageReceived(ws, message) {
  debug(`Received WebSocket message: ${JSON.stringify(message)}`);
  // Do something with message...
}
