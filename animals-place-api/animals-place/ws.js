import createDebugger from "debug";
import { WebSocketServer } from "ws";

const debug = createDebugger("express-api:messaging");

const clients = [];

const users_websocket = new Map();

export function createWebSocketServer(httpServer) {
  debug("Creating WebSocket server");
  const wss = new WebSocketServer({
    server: httpServer,
  });

  // Handle new client connections.
  wss.on("connection", function (ws) {
    debug("New WebSocket client connected");
    // console.log("New WebSocket client connected");

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
      //  console.log("message received : ", parsedMessage);
    });

    // Clean up disconnected clients.
    ws.on("close", () => {
      clients.splice(clients.indexOf(ws), 1);
      debug("WebSocket client disconnected");
    });
  });
}

export function broadcastMessage(message) {
  debug(
    `Broadcasting message to all connected clients: ${JSON.stringify(message)}`
  );

  clients.forEach((c) => c.send(JSON.stringify(message)));
  // console.log("un message a été envoyé : ", message);
}

export function sendMessageToConnectedClient(userID, message) {
  debug(`Sending message to a connected client: ${JSON.stringify(message)}`);

  // console.log("userID destination : ", userID);
  // console.log("message : ", message);

  const client = users_websocket.get(userID);
  // console.log("client : ", client);

  if (client && client.readyState === client.OPEN) {
    try {
      client.send(JSON.stringify(message));
      //   console.log("Un message a été envoyé : ", message);
    } catch (error) {
      console.error("Error sending message to client with ID");
    }
  } else {
    // si varaible env est test on ne logue pas
    if (process.env.NODE_ENV !== "test")
      console.error(
        "Client with ID " + userID + " is not connected or does not exist."
      );
  }
}

function onMessageReceived(ws, message) {
  debug(`Received WebSocket message: ${JSON.stringify(message)}`);
  // Do something with message...

  if (message.type === "new_user") {
    users_websocket.set(message.id, ws);
    //  console.log("users_websocket : ", users_websocket);
  }
}
