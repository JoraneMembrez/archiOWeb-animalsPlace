const express = require("express");
const app = express();
const server = require("http").createServer(express);
const WebSocket = require("ws");

const wss = new WebSocket.Server({ server: server });

wss.on("connection", function (ws) {
  console.log("Nouvelle connexion");
  ws.send("Bienvenue sur le serveur de chat");

  ws.on("message", function incoming(message) {
    console.log("received: %s", message);

    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });
});

app.get("/", (req, res) => {
  res.send("Hello World");
});

server.listen(3000, () => {
  console.log("Server started on port 3000");
});
