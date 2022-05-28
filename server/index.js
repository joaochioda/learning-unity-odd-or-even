const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 8080 }, () => {
  console.log("server started");
});
wss.on("connection", function connection(ws) {
  ws.on("message", (data) => {
    const stringData = Buffer.from(data).toString();
    console.log("data received \n %o", stringData);
    ws.send(data);
  });
});
wss.on("listening", () => {
  console.log("listening on 8080");
});
