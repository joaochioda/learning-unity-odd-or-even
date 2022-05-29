const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 }, () => {
  console.log("server started");
});

const roomWaitingPlayers = [];
const rooms = [];

const stateMachine = {
  waiting_for_player: 1,
  pick_odd_or_even: 2,
  waiting_for_players_number: 3,
};

function roomLogic(ws, idPlayer) {
  const idRoom = Math.random() * 10 ** 16;
  const player = {
    id: idPlayer,
    ws: ws,
    action: "",
    choice: "",
    number: 0,
  };
  if (roomWaitingPlayers.length === 0) {
    roomWaitingPlayers.push({
      id: idRoom,
      players: [player],
      state: stateMachine["waiting_for_player"],
    });
    return idRoom;
  } else {
    roomWaitingPlayers[0].players.push(player);
    rooms.push(roomWaitingPlayers[0]);
    roomWaitingPlayers.shift();

    const choosePlayerToStart = Math.floor(Math.random() * 2);

    if (choosePlayerToStart === 0) {
      rooms[rooms.length - 1].players[0].action = "pick_odd_or_even";
      rooms[rooms.length - 1].players[1].action = "waiting_opponent";
    } else {
      rooms[rooms.length - 1].players[0].action = "waiting_opponent";
      rooms[rooms.length - 1].players[1].action = "pick_odd_or_even";
    }
    rooms[rooms.length - 1].players.forEach((player) => {
      player.ws.send(JSON.stringify({ type: player.action }));
    });

    rooms[rooms.length - 1].state = stateMachine["pick_odd_or_even"];
    return rooms[rooms.length - 1].id;
  }
}

function findRoomById(id) {
  return rooms.find((room) => room.id === id);
}

function handlePlayerPick(room, player, choise) {
  if (
    room.state === stateMachine["pick_odd_or_even"] &&
    player.action === "pick_odd_or_even" &&
    (choise === "odd" || choise === "even")
  ) {
    if (choise === "odd") {
      room.players.forEach((p) => {
        p.id === player.id ? (p.choice = "odd") : (p.choice = "even");
      });
    } else {
      room.players.forEach((p) => {
        p.id === player.id ? (p.choice = "even") : (p.choice = "odd");
      });
    }
    room.state = stateMachine["waiting_for_players_number"];
    room.players.forEach((player) => {
      player.ws.send(
        JSON.stringify({ type: "waiting_for_number", choice: player.choice })
      );
    });
  }
}

wss.on("connection", (ws) => {
  const idPlayer = Math.random() * 10 ** 16;
  const idRoom = roomLogic(ws, idPlayer);
  ws.on("message", (data) => {
    try {
      const string = Buffer.from(data).toString();
      const stringToJson = JSON.parse(string);

      const room = findRoomById(idRoom);
      const player = room.players.find((player) => player.id === idPlayer);

      switch (Object.keys(stringToJson)[0]) {
        case "pick_odd_or_even":
          handlePlayerPick(
            room,
            player,
            (choise = stringToJson.pick_odd_or_even)
          );
          break;
      }
    } catch (ex) {
      return;
    }
  });

  ws.on("picked", (data) => {
    console.log(data);
  });
});
wss.on("listening", () => {
  console.log("listening on 8080");
});
