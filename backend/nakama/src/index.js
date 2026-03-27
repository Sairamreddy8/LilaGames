var matchInit = function (ctx, logger, nk, params) {
  logger.info("Match initialized. ID: %s", ctx.matchId);

  // Build label from params (room name, code, creator, timer) or default
  var roomName = (params && params.room_name) || "";
  var roomCode = (params && params.room_code) || "";
  var creatorName = (params && params.creator_name) || "";
  var timerMode = (params && params.timerMode) || "untimed";

  var label = JSON.stringify({
    game: "tictactoe",
    room_name: roomName,
    room_code: roomCode,
    creator: creatorName,
    timerMode: timerMode,
    open: true,
    player_count: 0,
  });

  var state = {
    board: [null, null, null, null, null, null, null, null, null],
    presences: {}, // Keyed by sessionId: { userId, symbol, name }
    pendingNames: {}, // Temporary storage for names from joinAttempt
    currentSymbol: "X",
    startingSymbol: "X", // Which symbol starts the current game
    winner: null,
    isDraw: false,
    rematchRequests: {}, // Tracks sessionIds that want a rematch
    roomName: roomName,
    roomCode: roomCode,
    creatorName: creatorName,
    creatorSessionId: null, // To be set on first join
    timerMode: timerMode,
  };
  return {
    state: state,
    tickRate: 10,
    label: label,
  };
};

var matchJoinAttempt = function (
  ctx,
  logger,
  nk,
  dispatcher,
  tick,
  state,
  presence,
  metadata,
) {
  var presenceCount = Object.keys(state.presences).length;
  if (presenceCount >= 2) {
    return { state: state, accept: false, rejectMessage: "Match full" };
  }
  if (metadata && metadata.name) {
    state.pendingNames[presence.sessionId] = metadata.name;
  }
  return { state: state, accept: true };
};

var matchJoin = function (ctx, logger, nk, dispatcher, tick, state, presences) {
  presences.forEach(function (p) {
    var name =
      state.pendingNames[p.sessionId] || "Player " + p.userId.slice(0, 4);
    var symbol = Object.keys(state.presences).length === 0 ? "X" : "O";

    state.presences[p.sessionId] = {
      userId: p.userId,
      symbol: symbol,
      name: name,
    };

    // First player to join is the creator of the room
    if (state.creatorSessionId === null) {
      state.creatorSessionId = p.sessionId;
      logger.info(
        "Creator session %s assigned for room %s",
        p.sessionId,
        state.roomCode,
      );
    }

    delete state.pendingNames[p.sessionId];
    logger.info(
      "Player %s (%s) joined match %s as %s. Total now: %d",
      name,
      p.userId,
      ctx.matchId,
      symbol,
      Object.keys(state.presences).length,
    );

    try {
      dispatcher.broadcastMessage(3, JSON.stringify({ symbol: symbol }), [p]);
    } catch (e) {
      logger.error("Failed to send opCode 3: %s", e.message);
    }
  });

  logger.info("Broadcasting full state for match %s", ctx.matchId);
  broadcastFullState(dispatcher, state);

  // Update label with player count
  var playerCount = Object.keys(state.presences).length;
  var labelObj = {
    game: "tictactoe",
    room_name: state.roomName || "",
    room_code: state.roomCode || "",
    creator: state.creatorName || "",
    timerMode: state.timerMode || "untimed",
    open: playerCount < 2,
    player_count: playerCount,
  };
  dispatcher.matchLabelUpdate(JSON.stringify(labelObj));

  return { state: state };
};

var matchLeave = function (
  ctx,
  logger,
  nk,
  dispatcher,
  tick,
  state,
  presences,
) {
  presences.forEach(function (p) {
    delete state.presences[p.sessionId];
    delete state.pendingNames[p.sessionId];
    delete state.rematchRequests[p.sessionId];
    logger.info("Player %s (session %s) left", p.userId, p.sessionId);
  });

  // 1. If the room is empty, terminate
  var remainingSessions = Object.keys(state.presences);
  if (remainingSessions.length === 0) {
    logger.info("Room %s is empty, terminating.", state.roomCode);
    return null;
  }

  // 2. If it's a private room (has a code) and the creator leaves, terminate
  var creatorLeft = false;
  presences.forEach(function (p) {
    if (p.sessionId === state.creatorSessionId) {
      creatorLeft = true;
    }
  });

  if (state.roomCode && creatorLeft) {
    logger.info("Creator left room %s, terminating match.", state.roomCode);
    return null;
  }

  // 3. Update label with player count for remaining players
  var playerCount = Object.keys(state.presences).length;
  var labelObj = {
    game: "tictactoe",
    room_name: state.roomName || "",
    room_code: state.roomCode || "",
    creator: state.creatorName || "",
    timerMode: state.timerMode || "untimed",
    open: playerCount < 2,
    player_count: playerCount,
  };
  dispatcher.matchLabelUpdate(JSON.stringify(labelObj));

  // 4. Notify remaining player
  if (remainingSessions.length === 1) {
    dispatcher.broadcastMessage(6, JSON.stringify({ reason: "Opponent left" }));
  }

  return { state: state };
};

var matchLoop = function (ctx, logger, nk, dispatcher, tick, state, messages) {
  messages.forEach(function (msg) {
    var pData = state.presences[msg.sender.sessionId];
    var playerSymbol = pData ? pData.symbol : null;

    if (msg.opCode === 1) {
      // MOVE
      if (state.winner || state.isDraw) return;
      if (!playerSymbol || playerSymbol !== state.currentSymbol) {
        dispatcher.broadcastMessage(
          9,
          JSON.stringify({ reason: "Not your turn" }),
          [msg.sender],
        );
        return;
      }

      var data;
      try {
        data = JSON.parse(nk.binaryToString(msg.data));
      } catch (e) {
        return;
      }

      var index = data.index;
      if (
        index === undefined ||
        index < 0 ||
        index > 8 ||
        state.board[index] !== null
      ) {
        dispatcher.broadcastMessage(
          9,
          JSON.stringify({ reason: "Invalid move" }),
          [msg.sender],
        );
        return;
      }

      state.board[index] = playerSymbol;

      var winLine = checkWin(state.board, playerSymbol);
      if (winLine) {
        state.winner = playerSymbol;
      } else if (isBoardFull(state.board)) {
        state.isDraw = true;
      } else {
        state.currentSymbol = playerSymbol === "X" ? "O" : "X";
      }

      broadcastFullState(dispatcher, state);
    } else if (msg.opCode === 4) {
      // REMATCH
      if (state.winner || state.isDraw) {
        state.rematchRequests[msg.sender.sessionId] = true;
        var requestCount = Object.keys(state.rematchRequests).length;
        var totalPresences = Object.keys(state.presences).length;

        logger.info(
          "Rematch requested by %s. Total: %d/%d",
          msg.sender.userId,
          requestCount,
          totalPresences,
        );

        // Tell everyone who wants a rematch (optional: opCode 5 for "Waiting for other player")

        if (requestCount >= 2 && requestCount >= totalPresences) {
          state.board = [null, null, null, null, null, null, null, null, null];
          state.winner = null;
          state.isDraw = false;
          state.rematchRequests = {}; // Reset requests

          state.startingSymbol = state.startingSymbol === "X" ? "O" : "X";
          state.currentSymbol = state.startingSymbol;

          logger.info(
            "Both players ready. Rematch starting! %s starts.",
            state.currentSymbol,
          );
          broadcastFullState(dispatcher, state);
        }
      }
    }
  });

  return { state: state };
};

function broadcastFullState(dispatcher, state) {
  var playerNames = {};
  Object.keys(state.presences).forEach(function (sid) {
    var p = state.presences[sid];
    playerNames[p.symbol] = p.name;
  });

  var syncData = {
    board: state.board,
    currentSymbol: state.currentSymbol,
    winner: state.winner,
    isDraw: state.isDraw,
    playerNames: playerNames,
  };

  dispatcher.broadcastMessage(2, JSON.stringify(syncData));
}

var matchTerminate = function (
  ctx,
  logger,
  nk,
  dispatcher,
  tick,
  state,
  graceSeconds,
) {
  return { state: state };
};

var matchSignal = function (ctx, logger, nk, dispatcher, tick, state, data) {
  return { state: state, data: data };
};

function checkWin(board, symbol) {
  var lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (
      board[line[0]] === symbol &&
      board[line[1]] === symbol &&
      board[line[2]] === symbol
    ) {
      return line;
    }
  }
  return null;
}

function isBoardFull(board) {
  for (var i = 0; i < board.length; i++) {
    if (board[i] === null) return false;
  }
  return true;
}

function matchmakerMatched(ctx, logger, nk, matchedEntries) {
  var params = {};
  if (matchedEntries.length > 0 && matchedEntries[0].properties) {
    params = matchedEntries[0].properties;
    logger.info("Matchmaker matched with properties: %s", JSON.stringify(params));
  }
  return nk.matchCreate("tictactoe", params);
}

// ============== Room RPCs ==============

function generateRoomCode() {
  var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 to avoid confusion
  var code = "";
  for (var i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Simple robust JSON parse that handles Uint8Array and double-stringified JSON.
 */
function parsePayload(nk, payload) {
  if (!payload) return {};
  var str = typeof payload === "string" ? payload : nk.binaryToString(payload);
  if (!str) return {};
  try {
    var obj = JSON.parse(str);
    // If str was "\"{\\\"foo\\\":\\\"bar\\\"}\"", obj is now "{\"foo\":\"bar\"}"
    if (typeof obj === "string") {
      return JSON.parse(obj);
    }
    return obj;
  } catch (e) {
    return typeof payload === "object" ? payload : {};
  }
}

function rpcCreateRoom(ctx, logger, nk, payload) {
  var input = parsePayload(nk, payload);
  logger.info("rpcCreateRoom parsed input: %s", JSON.stringify(input));

  var roomName = input.room_name || "Game Room";
  var creatorName = input.creator_name || "Host";
  var roomCode = generateRoomCode();

  logger.info(
    "Creating room '%s' with code %s by %s",
    roomName,
    roomCode,
    creatorName,
  );

  var matchId;
  try {
    matchId = nk.matchCreate("tictactoe", {
      room_name: roomName,
      room_code: roomCode,
      creator_name: creatorName,
    });
  } catch (e) {
    logger.error("matchCreate failed: %s", e.message);
    return JSON.stringify({ error: "Failed to create match" });
  }

  logger.info("rpcCreateRoom SUCCESS: matchId=%s, code=%s", matchId, roomCode);

  return JSON.stringify({
    match_id: matchId,
    room_code: roomCode,
    room_name: roomName,
  });
}

function rpcListRooms(ctx, logger, nk, payload) {
  var input = parsePayload(nk, payload);
  // List matches that are open (player_count < 2)
  var limit = 20;
  var isAuthoritative = true;
  var label = "";
  var minSize = 0;
  var maxSize = 2; // Return all potentially open rooms
  var query = "+label.game:tictactoe"; // Relaxed query for maximum reliability

  var matches = [];
  try {
    matches = nk.matchList(
      limit,
      isAuthoritative,
      label,
      minSize,
      maxSize,
      query,
    );
    logger.info(
      "rpcListRooms: found %d matches total with query %s",
      matches.length,
      query,
    );
  } catch (e) {
    logger.error("rpcListRooms failed: %s", e.message);
    return JSON.stringify({ error: "Failed to list rooms" });
  }

  var rooms = [];
  for (var i = 0; i < matches.length; i++) {
    var m = matches[i];
    if (!m.label) continue;

    var labelObj = {};
    try {
      labelObj = JSON.parse(m.label);
    } catch (e) {
      continue;
    }

    // Filter only open rooms with a room code here in JS
    if (labelObj.room_code && labelObj.open) {
      rooms.push({
        match_id: m.matchId || m.match_id,
        room_name: labelObj.room_name || "Game Room",
        room_code: labelObj.room_code,
        creator: labelObj.creator || "",
        player_count: m.size,
      });
    }
  }

  logger.info("rpcListRooms: returning %d joinable rooms", rooms.length);
  return JSON.stringify({ rooms: rooms });
}

function rpcJoinByCode(ctx, logger, nk, payload) {
  var input = parsePayload(nk, payload);
  logger.info("rpcJoinByCode parsed input: %s", JSON.stringify(input));

  var code = (input.code || "").toUpperCase().trim();
  if (!code) {
    return JSON.stringify({ error: "Room code is required" });
  }

  // Search for the match. Use broad query to find ANY Tic-Tac-Toe match.
  var query = "*"; // Broadest query to ensure we find the match even if label.game isn't indexing well
  var matches = [];
  try {
    // We increase limit to 500 to find any game even if many non-TTT matches exist
    matches = nk.matchList(500, true, "", 0, 2, query);
    logger.info(
      "rpcJoinByCode: scanning %d total authoritative matches for code %s",
      matches.length,
      code,
    );
  } catch (e) {
    logger.error("matchList for code lookup failed: %s", e.message);
    return JSON.stringify({ error: "Could not search for rooms" });
  }

  var foundMatch = null;
  var foundLabel = null;

  for (var i = 0; i < matches.length; i++) {
    var m = matches[i];
    if (!m.label) continue;

    try {
      var l = JSON.parse(m.label);
      if (l.room_code === code && l.open) {
        foundMatch = m;
        foundLabel = l;
        break;
      }
    } catch (e) {
      continue;
    }
  }

  if (!foundMatch) {
    return JSON.stringify({ error: "Room not found or full: " + code });
  }

  return JSON.stringify({
    match_id: foundMatch.matchId || foundMatch.match_id,
    room_name: foundLabel.room_name || "Game Room",
    room_code: code,
  });
}

function InitModule(ctx, logger, nk, initializer) {
  logger.info("Initializing Tic-Tac-Toe module (Rooms + Matchmaking)...");

  initializer.registerMatch("tictactoe", {
    matchInit: matchInit,
    matchJoinAttempt: matchJoinAttempt,
    matchJoin: matchJoin,
    matchLeave: matchLeave,
    matchLoop: matchLoop,
    matchTerminate: matchTerminate,
    matchSignal: matchSignal,
  });

  initializer.registerMatchmakerMatched(matchmakerMatched);

  // Room management RPCs
  initializer.registerRpc("create_room", rpcCreateRoom);
  initializer.registerRpc("list_rooms", rpcListRooms);
  initializer.registerRpc("join_by_code", rpcJoinByCode);

  logger.info("RPCs registered: create_room, list_rooms, join_by_code");
}
