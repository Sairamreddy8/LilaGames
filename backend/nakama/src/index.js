var matchInit = function (ctx, logger, nk, params) {
  logger.info("Match initialized. ID: %s", ctx.matchId);
  var state = {
    board: [null, null, null, null, null, null, null, null, null],
    presences: {}, // Keyed by sessionId: { userId, symbol, name }
    pendingNames: {}, // Temporary storage for names from joinAttempt
    currentSymbol: "X",
    startingSymbol: "X", // Which symbol starts the current game
    winner: null,
    isDraw: false,
    rematchRequests: {}, // Tracks sessionIds that want a rematch
  };
  return {
    state: state,
    tickRate: 10,
    label: "tictactoe",
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

    delete state.pendingNames[p.sessionId];
    logger.info(
      "Player %s (%s) joined match %s as %s",
      name,
      p.userId,
      ctx.matchId,
      symbol,
    );

    try {
      dispatcher.broadcastMessage(3, JSON.stringify({ symbol: symbol }), [p]);
    } catch (e) {
      logger.error("Failed to send opCode 3: %s", e.message);
    }
  });

  broadcastFullState(dispatcher, state);
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

  // If only 1 player remains, tell them their opponent left
  var remainingSessions = Object.keys(state.presences);
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
  return nk.matchCreate("tictactoe", {});
}

function InitModule(ctx, logger, nk, initializer) {
  logger.info("Initializing Tic-Tac-Toe module (Dual Rematch)...");

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
}
