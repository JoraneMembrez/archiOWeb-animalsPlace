import WebSocket from "ws";

const ws = new WebSocket("ws://localhost:8000");

ws.on("open", function open() {
  console.log("Connected to WebSocket server");

  const userID = "65366a2c8876d46616e9c2f4";

  ws.send(JSON.stringify({ type: "new_user", id: userID }));
  console.log("Message sent");
});

ws.on("message", function incoming(data) {
  console.log(`Received: ${data}`);
});

ws.on("close", function close() {
  console.log("Disconnected from WebSocket server");
});
