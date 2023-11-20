import WebSocket from "ws";

const ws = new WebSocket("ws://localhost:8000");

ws.on("open", function open() {
  console.log("Connected to WebSocket server");

  const newUser = {
    firstName: "webSocket",
    email: "web@gmail.com",
    password: "web",
  };

  ws.send(JSON.stringify({ type: "new_user", user: newUser }));
  // Envoyer un message
  ws.send(JSON.stringify({ type: "test", data: "Hello WebSocket!" }));
  console.log("Message sent");
});

ws.on("message", function incoming(data) {
  console.log(`Received: ${data}`);
});

ws.on("close", function close() {
  console.log("Disconnected from WebSocket server");
});
