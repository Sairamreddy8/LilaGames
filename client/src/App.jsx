import { useState, useCallback, useEffect } from "react";
import { useNakama } from "./nakama/useNakama";
import { checkWin, isBoardFull, emptyBoard } from "./game/logic";
import StartScreen from "./components/StartScreen";
import Board from "./components/Board";
import StatusBar from "./components/StatusBar";
import Scoreboard from "./components/Scoreboard";
import styles from "./App.module.css";

const INITIAL_SCORES = { X: 0, O: 0, draws: 0 };

/**
 * Nakama server opcodes:
 *   1 — MOVE:       server broadcasts { index, symbol } after validating a move
 *   2 — STATE_SYNC: server sends full board state { board, currentSymbol, winner, isDraw }
 *   9 — ERROR:      server rejects a move { reason }
 */

export default function App() {
  // Game state
  const [gamePhase, setGamePhase] = useState("start"); // 'start' | 'playing' | 'over'
  const [board, setBoard] = useState(emptyBoard());
  const [currentSymbol, setCurrent] = useState("X");
  const [winLine, setWinLine] = useState(null);
  const [isDraw, setIsDraw] = useState(false);
  const [winner, setWinner] = useState(null);
  const [scores, setScores] = useState(INITIAL_SCORES);
  const [playerNames, setPlayerNames] = useState({
    X: "Player X",
    O: "Player O",
  });
  const [userName, setUserName] = useState("");

  // Mode & online state
  const [mode, setMode] = useState("local");
  const [mySymbol, setMySymbol] = useState(null); // for online play
  const [rematchWaiting, setRematchWaiting] = useState(false);

  const {
    session,
    connecting,
    error: nakamaError,
    match,
    findMatch,
    leaveMatch,
    sendMove,
    socket,
    onMatchDataRef,
    onMatchPresenceRef,
  } = useNakama();

  // ---- Handle incoming match data (online mode) ----
  // The client NEVER applies moves locally in online mode.
  // All state changes come from server-authoritative messages only.
  useEffect(() => {
    onMatchPresenceRef.current = (presence) => {
      if (presence.leaves && presence.leaves.length > 0) {
        // If someone else left, it's an opponent-left situation
        const me = session?.user_id;
        const othersLeft = presence.leaves.filter((p) => p.user_id !== me);
        if (othersLeft.length > 0) {
          setGamePhase("opponent-left");
        }
      }
    };
  }, [session]);

  useEffect(() => {
    onMatchDataRef.current = (data) => {
      const payload = JSON.parse(new TextDecoder().decode(data.data));

      if (data.op_code === 1) {
        // Server confirmed move: { index, symbol }
        applyMove(payload.index, payload.symbol);
      } else if (data.op_code === 2) {
        // Full state sync: { board, currentSymbol, winner, isDraw, playerNames }
        setBoard(payload.board);
        setCurrent(payload.currentSymbol);

        // If we were on the "Game Over" screen and the board was reset, go back to "playing"
        if (
          gamePhase === "over" &&
          payload.board.every((cell) => cell === null)
        ) {
          setGamePhase("playing");
          setRematchWaiting(false);
          resetRound(); // Clear local winner/draw state
        }

        if (payload.playerNames) {
          console.log("Names sync from server:", payload.playerNames);
          setPlayerNames((prev) => ({ ...prev, ...payload.playerNames }));
        }

        if (payload.winner) {
          setWinner(payload.winner);
          setWinLine(checkWin(payload.board, payload.winner));
          setScores((s) => ({ ...s, [payload.winner]: s[payload.winner] + 1 }));
          setGamePhase("over");
        } else if (payload.isDraw) {
          setIsDraw(true);
          setScores((s) => ({ ...s, draws: s.draws + 1 }));
          setGamePhase("over");
        }
      } else if (data.op_code === 3) {
        // Symbol assignment: { symbol }
        console.log("Assigned symbol from server:", payload.symbol);
        setMySymbol(payload.symbol);
      } else if (data.op_code === 6) {
        // Opponent Left
        setGamePhase("opponent-left");
      } else if (data.op_code === 9) {
        // Server rejected the move
        console.warn("Move rejected by server:", payload.reason);
      }
    };
  });

  // Keep playerNames in sync with server one more way (optional but robust)
  useEffect(() => {
    if (mode === "online" && !mySymbol) {
      // If we joined but haven't received symbol, we might have missed it?
      // State sync (opCode 2) will eventually fix it if it includes our ID.
    }
  }, [mode, mySymbol]);

  // ---- Core move logic ----
  // `symbol` is provided by the server in online mode (op_code 1 payload).
  // In local mode it falls back to currentSymbol from state.
  const applyMove = useCallback(
    (index, symbol) => {
      const sym = symbol ?? currentSymbol;
      setBoard((prev) => {
        if (prev[index] !== null) return prev;
        const next = [...prev];
        next[index] = sym;

        const line = checkWin(next, sym);
        if (line) {
          setWinLine(line);
          setWinner(sym);
          setScores((s) => ({ ...s, [sym]: s[sym] + 1 }));
          setGamePhase("over");
        } else if (isBoardFull(next)) {
          setIsDraw(true);
          setScores((s) => ({ ...s, draws: s.draws + 1 }));
          setGamePhase("over");
        } else {
          setCurrent(() => (sym === "X" ? "O" : "X"));
        }
        return next;
      });
    },
    [currentSymbol],
  );

  const handleCellClick = useCallback(
    (index) => {
      if (gamePhase !== "playing") return;
      if (board[index] !== null) return;

      if (mode === "online") {
        // Only act on your turn.
        // Do NOT apply move locally — send intent to server and wait for
        // op_code 1 broadcast before updating board state.
        if (currentSymbol !== mySymbol) return;
        sendMove(index);
      } else {
        // Local mode: no server — validate and apply immediately
        applyMove(index);
      }
    },
    [gamePhase, board, mode, currentSymbol, mySymbol, sendMove, applyMove],
  );

  // ---- Start / restart ----
  const handleStart = useCallback(
    async (nameX, nameO) => {
      setUserName(nameX);
      setPlayerNames({ X: nameX, O: nameO });
      setScores(INITIAL_SCORES);
      resetRound();

      if (mode === "online") {
        setPlayerNames({ X: nameX, O: "Searching..." });
        try {
          if (match) await leaveMatch();
          await findMatch(nameX);
          setGamePhase("playing");
        } catch (e) {
          console.error("Matchmaking failed:", e);
        }
      } else {
        // Local mode
        setGamePhase("playing");
      }
    },
    [mode, findMatch, session, match, leaveMatch],
  );

  const resetRound = () => {
    setBoard(emptyBoard());
    // Do NOT hardcode setCurrent("X") here — the server's opCode 2 will sync this.
    setWinLine(null);
    setIsDraw(false);
    setWinner(null);
  };

  const handlePlayAgain = () => {
    resetRound();
    if (mode === "online" && match) {
      setRematchWaiting(true);
      socket.sendMatchState(match.match_id, 4, "");
    } else {
      setGamePhase("playing");
    }
  };

  const handleNewGame = async () => {
    if (mode === "online" && match) await leaveMatch();
    resetRound();
    setScores(INITIAL_SCORES);
    setGamePhase("start");
  };

  const isMyTurn = mode === "online" ? currentSymbol === mySymbol : undefined;
  const boardDisabled =
    gamePhase !== "playing" || (mode === "online" && !isMyTurn);

  return (
    <div className={styles.app}>
      {gamePhase === "start" ? (
        <StartScreen
          onStart={handleStart}
          connecting={connecting}
          mode={mode}
          onModeChange={setMode}
          error={nakamaError}
        />
      ) : (
        <div className={styles.gameLayout}>
          <header className={styles.header}>
            <h1 className={styles.logo}>
              <span className={styles.x}>X</span>
              <span className={styles.slash}>/</span>
              <span className={styles.o}>O</span>
            </h1>
            <button className={styles.quitBtn} onClick={handleNewGame}>
              ✕ Quit
            </button>
          </header>

          <Scoreboard scores={scores} playerNames={playerNames} />

          <StatusBar
            currentSymbol={currentSymbol}
            playerNames={playerNames}
            winner={winner}
            isDraw={isDraw}
            isMyTurn={isMyTurn}
          />

          <Board
            board={board}
            onCellClick={handleCellClick}
            winLine={winLine}
            disabled={boardDisabled}
          />

          {gamePhase === "over" && (
            <div className={styles.actions}>
              {rematchWaiting ? (
                <div className={styles.waitingNotice}>
                  ⏳ Waiting for opponent to accept rematch...
                </div>
              ) : (
                <button className={styles.btnPrimary} onClick={handlePlayAgain}>
                  🔄 Play Again
                </button>
              )}
              <button className={styles.btnSecondary} onClick={handleNewGame}>
                🏠 Main Menu
              </button>
            </div>
          )}

          {mode === "online" && match && (
            <p className={styles.matchInfo}>
              Match ID: <code>{match.match_id}</code>
            </p>
          )}
        </div>
      )}

      {gamePhase === "opponent-left" && (
        <div className={styles.overlay}>
          <div className={styles.dialog}>
            <h2>👋 Opponent Left</h2>
            <p>Your opponent has disconnected from the match.</p>
            <div className={styles.actions}>
              <button
                className={styles.btnPrimary}
                onClick={() => handleStart(userName, "")}
                disabled={connecting}
              >
                {connecting ? "⏳ Searching..." : "🔍 Find New Match"}
              </button>
              <button className={styles.btnSecondary} onClick={handleNewGame}>
                🏠 Main Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
