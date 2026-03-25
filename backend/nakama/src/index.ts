export var matchInit = function (ctx: any, logger: any, nk: any, params: any) {
  logger.info("Match initialized");
  var state = {
    board: [null, null, null, null, null, null, null, null, null],
    presences: {},
    currentSymbol: "X",
    winner: null,
    isDraw: false,
  };
  return {
    state: state,
    tickRate: 10,
    label: "tictactoe",
  };
};

export var matchJoinAttempt = function (
  ctx: any,
  logger: any,
  nk: any,
  dispatcher: any,
  tick: any,
  state: any,
  presence: any,
  metadata: any,
) {
  var presenceCount = Object.keys(state.presences).length;
  if (presenceCount >= 2) {
    return { state: state, accept: false, rejectMessage: "Match full" };
  }
  return { state: state, accept: true };
};

export var matchJoin = function (
  ctx: any,
  logger: any,
  nk: any,
  dispatcher: any,
  tick: any,
  state: any,
  presences: any[],
) {
  presences.forEach(function (p: any) {
    var symbol = Object.keys(state.presences).length === 0 ? "X" : "O";
    state.presences[p.userId] = symbol;
    logger.info("Player %s joined as %s", p.userId, symbol);
  });

  if (Object.keys(state.presences).length === 2) {
    var syncData = {
      board: state.board,
      currentSymbol: state.currentSymbol,
      winner: state.winner,
      isDraw: state.isDraw,
    };
    dispatcher.broadcastMessage(2, JSON.stringify(syncData));
  }

  return { state: state };
};

export var matchLeave = function (
  ctx: any,
  logger: any,
  nk: any,
  dispatcher: any,
  tick: any,
  state: any,
  presences: any[],
) {
  presences.forEach(function (p: any) {
    delete state.presences[p.userId];
    logger.info("Player %s left", p.userId);
  });
  return { state: state };
};

export var matchLoop = function (
  ctx: any,
  logger: any,
  nk: any,
  dispatcher: any,
  tick: any,
  state: any,
  messages: any[],
) {
  messages.forEach(function (msg: any) {
    var playerSymbol = state.presences[msg.sender.userId];

    if (msg.opCode === 1) {
      if (state.winner || state.isDraw) return;
      if (playerSymbol !== state.currentSymbol) {
        dispatcher.broadcastMessage(
          9,
          JSON.stringify({ reason: "Not your turn" }),
          [msg.sender],
        );
        return;
      }

      var payload = JSON.parse(nk.binaryToString(msg.data));
      var index = payload.index;

      if (index < 0 || index > 8 || state.board[index] !== null) {
        dispatcher.broadcastMessage(
          9,
          JSON.stringify({ reason: "Invalid move" }),
          [msg.sender],
        );
        return;
      }

      state.board[index] = playerSymbol;
      dispatcher.broadcastMessage(
        1,
        JSON.stringify({ index: index, symbol: playerSymbol }),
      );

      var winLine = checkWin(state.board, playerSymbol);
      if (winLine) {
        state.winner = playerSymbol;
        dispatcher.broadcastMessage(
          2,
          JSON.stringify({
            board: state.board,
            currentSymbol: state.currentSymbol,
            winner: state.winner,
            isDraw: false,
          }),
        );
      } else if (isBoardFull(state.board)) {
        state.isDraw = true;
        dispatcher.broadcastMessage(
          2,
          JSON.stringify({
            board: state.board,
            currentSymbol: state.currentSymbol,
            winner: null,
            isDraw: true,
          }),
        );
      } else {
        state.currentSymbol = playerSymbol === "X" ? "O" : "X";
      }
    }
  });

  return { state: state };
};

export var matchTerminate = function (
  ctx: any,
  logger: any,
  nk: any,
  dispatcher: any,
  tick: any,
  state: any,
  graceSeconds: any,
) {
  return { state: state };
};

export var matchSignal = function (
  ctx: any,
  logger: any,
  nk: any,
  dispatcher: any,
  tick: any,
  state: any,
  data: any,
) {
  return { state: state, data: data };
};

function checkWin(board: any[], symbol: string) {
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

function isBoardFull(board: any[]) {
  for (var i = 0; i < board.length; i++) {
    if (board[i] === null) return false;
  }
  return true;
}

export function InitModule(ctx: any, logger: any, nk: any, initializer: any) {
  logger.info("Initializing Tic-Tac-Toe module (ES5 build)...");
  initializer.registerMatch("tictactoe", {
    matchInit: matchInit,
    matchJoinAttempt: matchJoinAttempt,
    matchJoin: matchJoin,
    matchLeave: matchLeave,
    matchLoop: matchLoop,
    matchTerminate: matchTerminate,
    matchSignal: matchSignal,
  });
  logger.info("Tic-Tac-Toe match handler registered.");
}
