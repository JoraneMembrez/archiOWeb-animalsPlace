import { WebSocketServer } from "ws";

const clients = [];

export function createWebSocketServer(httpServer) {
  const wss = new WebSocketServer({
    server: httpServer,
  });

  // Handle new client connections.
  wss.on("connection", function (ws) {
    // Keep track of clients.
    clients.push(ws);
    clients.forEach((c) =>
      c.send(
        JSON.stringify(
          "Il y a actuellement : " +
            clients.length +
            " : utilistateurs connectés"
        )
      )
    );
    // Listen for messages sent by clients.
    ws.on("message", (message) => {
      // Make sure the message is valid JSON.
      let parsedMessage;
      try {
        parsedMessage = JSON.parse(message);
      } catch (err) {
        // Send an error message to the client with "ws" if you want...
      }

      // Handle the message.
      onMessageReceived(ws, parsedMessage);
    });

    // Clean up disconnected clients.
    ws.on("close", () => {
      clients.splice(clients.indexOf(ws), 1);
      clients.forEach((c) =>
        c.send(
          JSON.stringify(
            "Il y a actuellement " + clients.length + " utilistateurs connectés"
          )
        )
      );
    });
  });
}

export function broadcastMessage(message) {
  // You can easily iterate over the "clients" array to send a message to all
  // connected clients.
  clients.forEach((c) => c.send(JSON.stringify(message)));
}

function onMessageReceived(ws, message) {
  // Do something with message...
  console.log(message);
}
