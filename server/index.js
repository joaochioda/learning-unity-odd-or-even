/*
---------TODO---------
Extra
timer for actions
handle lost connection
*/

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

function handlePickNumber(room, player, choise) {
  const intChoise = parseInt(choise);
  if (
    room.state === stateMachine["waiting_for_players_number"] &&
    (intChoise === 1 || intChoise === 2)
  ) {
    room.players.forEach((p) => {
      p.id === player.id ? (p.number = intChoise) : null;
    });
    if (room.players[0].number !== 0 && room.players[1].number !== 0) {
      decideWinner(room);
    } else {
      player.ws.send(JSON.stringify({ type: "waiting_for_player_number" }));
    }
  }
}

function decideWinner(room) {
  const sumNumber = room.players[0].number + room.players[1].number;
  if (sumNumber % 2 === 0) {
    if (room.players[0].choice === "even") {
      room.players[0].ws.send(
        JSON.stringify({ type: "win", number: sumNumber })
      );
      room.players[1].ws.send(
        JSON.stringify({ type: "lose", number: sumNumber })
      );
    } else {
      room.players[0].ws.send(
        JSON.stringify({ type: "lose", number: sumNumber })
      );
      room.players[1].ws.send(
        JSON.stringify({ type: "win", number: sumNumber })
      );
    }
  } else {
    if (room.players[0].choice === "odd") {
      room.players[0].ws.send(
        JSON.stringify({ type: "win", number: sumNumber })
      );
      room.players[1].ws.send(
        JSON.stringify({ type: "lose", number: sumNumber })
      );
    } else {
      room.players[0].ws.send(
        JSON.stringify({ type: "lose", number: sumNumber })
      );
      room.players[1].ws.send(
        JSON.stringify({ type: "win", number: sumNumber })
      );
    }
    room.players[0].ws.close();
    room.players[1].ws.close();
    rooms.splice(rooms.indexOf(room), 1);
  }
  room.players[0].ws.close();
  room.players[1].ws.close();
  rooms.splice(rooms.indexOf(room), 1);
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
      switch (stringToJson.type) {
        case "pick_odd_or_even":
          handlePlayerPick(room, player, (choise = stringToJson.message));
          break;
        case "waiting_for_players_number":
          handlePickNumber(room, player, stringToJson.message);
      }
    } catch (ex) {
      console.log(ex);
      return;
    }
  });

  ws.on("close", () => {
    const room = findRoomById(idRoom);
    if (!room) {
      const roomWaitingPlayer = roomWaitingPlayers.find(
        (room) => room.id === idRoom
      );

      if (roomWaitingPlayer) {
        roomWaitingPlayer.players[0].id === idPlayer
          ? roomWaitingPlayers.shift()
          : null;
      }
    }
  });
});
