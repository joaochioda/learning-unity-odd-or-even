const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 }, () => {
  console.log("server started");
});

const roomWaitingPlayers = [];
const rooms = [];

const stateMachine = {
  "waiting_for_player": 1,
  "waiting_for_player_pick": 2,
  "waiting_for_players_number": 3,
}

function roomLogic(ws) {
  const idRoom = Math.random() * 10 ** 16;
  if (roomWaitingPlayers.length === 0) {
    roomWaitingPlayers.push({
      id: idRoom,
      players: [ws],
      state: stateMachine["waiting_for_player"],
    });
    return idRoom;
  } else {
    roomWaitingPlayers[0].players.push(ws);
    rooms.push(roomWaitingPlayers[0]);
    roomWaitingPlayers.shift();

    rooms[rooms.length - 1].players.forEach((player) => {
      player.send(JSON.stringify({ type: "room is ready to" }));
    });

    const choosePlayerToStart = Math.floor(Math.random() * 2);
    rooms[rooms.length - 1].players[choosePlayerToStart].send(
      JSON.stringify({ type: "Pick", message: "Choose odd or even" })
    );
    choosePlayerToStart === 0
      ? rooms[rooms.length - 1].players[1].send(
          JSON.stringify({ type: "Pick", message: "Waiting player pick" })
        )
      : rooms[rooms.length - 1].players[0].send(
          JSON.stringify({ type: "Pick", message: "Waiting player pick" })
        );
    rooms[rooms.length - 1].state = stateMachine["waiting_for_player_pick"];
    return rooms[rooms.length - 1].id;
  }
}

function findRoomById(id) {
  return rooms.find((room) => room.id === id);
}

wss.on("connection", (ws) => {
  const idRoom = roomLogic(ws);

  ws.on("message", (data) => {
      const string = Buffer.from(data).toString();
      const stringToJson = JSON.parse(string);
      console.log(stringToJson);
  });

  ws.on('picked', (data) => {
    console.log(data)
  });
});
wss.on("listening", () => {
  console.log("listening on 8080");
});
