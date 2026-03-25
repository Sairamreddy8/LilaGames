const matchInit = (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  params: { [key: string]: string },
): { state: nkruntime.MatchState; tickRate: number; label: string } => {
  logger.info("Match initialized");
  const state: nkruntime.MatchState = {
    board: new Array(9).fill(null),
    presences: {},
    currentSymbol: "X",
    winner: null,
    isDraw: false,
  };
  return {
    state,
    tickRate: 10,
    label: "tictactoe",
  };
};

const matchJoinAttempt = (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: nkruntime.MatchState,
  presence: nkruntime.Presence,
  metadata: { [key: string]: any },
): { state: nkruntime.MatchState; accept: boolean; rejectMessage?: string } => {
  const presenceCount = Object.keys(state.presences).length;
  if (presenceCount >= 2) {
    return { state, accept: false, rejectMessage: "Match full" };
  }
  return { state, accept: true };
};

const matchJoin = (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: nkruntime.MatchState,
  presences: nkruntime.Presence[],
): { state: nkruntime.MatchState } => {
  presences.forEach((p) => {
    const symbol = Object.keys(state.presences).length === 0 ? "X" : "O";
    state.presences[p.userId] = symbol;
    logger.info("Player %s joined as %s", p.userId, symbol);
  });

  // If we have 2 players, sync the initial state
  if (Object.keys(state.presences).length === 2) {
    const syncData = {
      board: state.board,
      currentSymbol: state.currentSymbol,
      winner: state.winner,
      isDraw: state.isDraw,
    };
    dispatcher.broadcastMessage(2, JSON.stringify(syncData));
  }

  return { state };
};

const matchLeave = (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: nkruntime.MatchState,
  presences: nkruntime.Presence[],
): { state: nkruntime.MatchState } => {
  presences.forEach((p) => {
    delete state.presences[p.userId];
    logger.info("Player %s left", p.userId);
  });
  return { state };
};

const matchLoop = (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: nkruntime.MatchState,
  messages: nkruntime.MatchMessage[],
): { state: nkruntime.MatchState } | null => {
  messages.forEach((msg) => {
    const playerSymbol = state.presences[msg.sender.userId];

    // Opcode 1: MOVE
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

      const payload = JSON.parse(nk.binaryToString(msg.data));
      const index = payload.index;

      if (index < 0 || index > 8 || state.board[index] !== null) {
        dispatcher.broadcastMessage(
          9,
          JSON.stringify({ reason: "Invalid move" }),
          [msg.sender],
        );
        return;
      }
      // Apply move
      state.board[index] = playerSymbol;

      // Broadcast MOVE to everyone (opcode 1)
      dispatcher.broadcastMessage(
        1,
        JSON.stringify({ index, symbol: playerSymbol }),
      );

      // Check for win/draw
      const winLine = checkWin(state.board, playerSymbol);
      if (winLine) {
        state.winner = playerSymbol;
        // Broadcast sync with winner
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
        // Switch turn
        state.currentSymbol = playerSymbol === "X" ? "O" : "X";
      }
    }
  });

  return { state };
};

const matchTerminate = (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: nkruntime.MatchState,
  graceSeconds: number,
): { state: nkruntime.MatchState } => {
  return { state };
};

const matchSignal = (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: nkruntime.MatchState,
  data: string,
): { state: nkruntime.MatchState; data?: string } => {
  return { state, data };
};

// Helper logic
function checkWin(board: (string | null)[], symbol: string): number[] | null {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8], // rows
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8], // cols
    [0, 4, 8],
    [2, 4, 6], // diags
  ];
  for (const line of lines) {
    if (line.every((i) => board[i] === symbol)) return line;
  }
  return null;
}

function isBoardFull(board: (string | null)[]): boolean {
  return board.every((cell) => cell !== null);
}

export const MatchHandler: nkruntime.MatchHandler = {
  matchInit,
  matchJoinAttempt,
  matchJoin,
  matchLeave,
  matchLoop,
  matchTerminate,
  matchSignal,
};
