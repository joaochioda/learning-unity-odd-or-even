const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 }, () => {
  console.log("server started");
});

const roomWaitingPlayers = [];
const rooms = [];

wss.on("connection", (ws) => {
  if (roomWaitingPlayers.length === 0) {
    const idRoom = Math.random() * 10 ** 16;
    roomWaitingPlayers.push({
      id: idRoom,
      players: [ws],
    });
  } else {
    roomWaitingPlayers[0].players.push(ws);
    rooms.push(roomWaitingPlayers[0]);
    roomWaitingPlayers.shift();

    rooms[rooms.length - 1].players.forEach((player) => {
      player.send(JSON.stringify({ type: "room is ready to" }));
    })
  }
  
  ws.on("message", (data) => {
    const stringData = Buffer.from(data).toString();
    console.log("data received \n %o", stringData);
    ws.send(data);
  });
});
wss.on("listening", () => {
  console.log("listening on 8080");
});
