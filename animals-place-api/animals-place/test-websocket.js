import WebSocket from "ws";

const ws = new WebSocket("ws://localhost:8000");

ws.on("open", function open() {
  console.log("Connected to WebSocket server");

  // ID correspondant de l'user dans la base de donnée
  const userID = "655379f9f4da0d1eb4f841b8";

  ws.send(JSON.stringify({ type: "new_user", id: userID }));
  console.log("Message sent");
});

ws.on("message", function incoming(data) {
  console.log(`Received: ${data}`);
});

ws.on("close", function close() {
  console.log("Disconnected from WebSocket server");
});
