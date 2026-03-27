import { useState, useCallback, useEffect, useRef } from "react";
import { useNakama } from "./nakama/useNakama";
import { checkWin, isBoardFull, emptyBoard } from "./game/logic";
import StartScreen from "./components/StartScreen";
import Board from "./components/Board";
import StatusBar from "./components/StatusBar";
import Scoreboard from "./components/Scoreboard";
import RoomLobby from "./components/RoomLobby";
import styles from "./App.module.css";

const INITIAL_SCORES = { X: 0, O: 0, draws: 0 };
const TURN_SECONDS = 15;

/**
 * Nakama server opcodes:
 *   1 — MOVE:       server broadcasts { index, symbol } after validating a move
 *   2 — STATE_SYNC: server sends full board state { board, currentSymbol, winner, isDraw }
 *   3 — SYMBOL:     server assigns player symbol { symbol }
 *   4 — REMATCH:    client requests rematch
 *   6 — OPPONENT_LEFT: server notifies opponent disconnected
 *   9 — ERROR:      server rejects a move { reason }
 */

export default function App() {
  // Game state
  // Phases: 'start' | 'lobby' | 'waiting' | 'playing' | 'over' | 'opponent-left'
  const [gamePhase, setGamePhase] = useState("start");
  const [board, setBoard] = useState(emptyBoard());
  const [currentSymbol, setCurrent] = useState("X");
  const [winLine, setWinLine] = useState(null);
  const [isDraw, setIsDraw] = useState(false);
  const [winner, setWinner] = useState(null);
  const [scores, setScores] = useState(INITIAL_SCORES);
  const [timeLeft, setTimeLeft] = useState(TURN_SECONDS);
  const timerRef = useRef(null);
  const [playerNames, setPlayerNames] = useState({
    X: "Player X",
    O: "Player O",
  });
  const [userName, setUserName] = useState("");

  // Mode & online state
  const [mode, setMode] = useState("local");
  const [mySymbol, setMySymbol] = useState(null); // for online play
  const [rematchWaiting, setRematchWaiting] = useState(false);
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [searching, setSearching] = useState(false); // true while addMatchmaker is in flight

  // Refs so the interval callback always reads the latest values
  const mySymbolRef = useRef(mySymbol);
  const gamePhaseRef = useRef("start");
  const currentSymbolRef = useRef("X");
  const modeRef = useRef("local");
  const timerEnabledRef = useRef(true);

  useEffect(() => {
    mySymbolRef.current = mySymbol;
  }, [mySymbol]);
  useEffect(() => {
    gamePhaseRef.current = gamePhase;
  }, [gamePhase]);
  useEffect(() => {
    currentSymbolRef.current = currentSymbol;
  }, [currentSymbol]);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    timerEnabledRef.current = timerEnabled;
  }, [timerEnabled]);

  const [roomCode, setRoomCode] = useState(null);
  const [roomName, setRoomName] = useState(null);

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
    // Room operations
    createRoom,
    listRooms,
    joinRoom,
    joinByCode,
  } = useNakama();

  // ---- Handle incoming match data (online mode) ----
  useEffect(() => {
    onMatchPresenceRef.current = (presence) => {
      if (presence.leaves && presence.leaves.length > 0) {
        const me = session?.user_id;
        const othersLeft = presence.leaves.filter((p) => p.user_id !== me);
        if (othersLeft.length > 0) {
          setGamePhase("opponent-left");
        }
      }

      // Don't transition to "playing" here — let opCode 2 (state sync) handle it.
      // OpCode 2 carries the authoritative board state + player names, so transitioning
      // here could show an empty board before the sync arrives.
    };
  }, [session]);

  // Track previous game-over state so scores only increment once per game
  const prevGameOverRef = useRef(false);

  useEffect(() => {
    onMatchDataRef.current = (data) => {
      const payload = JSON.parse(new TextDecoder().decode(data.data));

      if (data.op_code === 1) {
        // Ignore opCode 1 in online mode — opCode 2 (full state sync) is authoritative.
        // Applying moves from both opcodes causes double score counting and flicker.
      } else if (data.op_code === 2) {
        // Full authoritative state sync from server
        setBoard(payload.board);
        setCurrent(payload.currentSymbol);

        if (payload.playerNames) {
          setPlayerNames((prev) => ({ ...prev, ...payload.playerNames }));
        }

        // Transition to playing once both players are present
        if (payload.playerNames && Object.keys(payload.playerNames).length >= 2) {
          setGamePhase((prev) => {
            if (prev === "waiting" || prev === "connecting") return "playing";
            return prev;
          });
          setSearching(false);
          setRematchWaiting(false);
        }

=======
>>>>>>> 09376516cafc990ad46d86f1c07f1e6df16df195
        if (payload.playerNames) {
          setPlayerNames((prev) => ({ ...prev, ...payload.playerNames }));
        }

        // Transition to playing once both players are present
        if (payload.playerNames && Object.keys(payload.playerNames).length >= 2) {
          setGamePhase((prev) => {
            if (prev === "waiting" || prev === "connecting") return "playing";
            return prev;
          });
          setSearching(false);
          setRematchWaiting(false);
        }

        if (payload.winner) {
          setWinner(payload.winner);
          setWinLine(checkWin(payload.board, payload.winner));
          // Only count the score once per game-over transition
          if (!prevGameOverRef.current) {
            prevGameOverRef.current = true;
            setScores((s) => ({ ...s, [payload.winner]: s[payload.winner] + 1 }));
          }
          setGamePhase("over");
        } else if (payload.isDraw) {
          setIsDraw(true);
          if (!prevGameOverRef.current) {
            prevGameOverRef.current = true;
            setScores((s) => ({ ...s, draws: s.draws + 1 }));
          }
          setGamePhase("over");
        } else {
          // Game is still in progress — reset the game-over guard
          prevGameOverRef.current = false;
        }
      } else if (data.op_code === 3) {
        // Symbol assignment: { symbol }
        setMySymbol(payload.symbol);
      } else if (data.op_code === 6) {
        // Opponent Left
        setGamePhase("opponent-left");
      } else if (data.op_code === 9) {
        // Server rejected the move
      }
    };
  });

  // ---- Per-turn countdown timer ----
  const stopTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const startTimer = useCallback(() => {
    clearInterval(timerRef.current);
    setTimeLeft(TURN_SECONDS);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          // Handle timeout directly here — refs are always current, no stale closure
          const phase = gamePhaseRef.current;
          const sym = currentSymbolRef.current;
          const m = modeRef.current;
          const timerOn = timerEnabledRef.current;
          if (phase === "playing" && timerOn) {
            // Online: only fire on the client whose turn it is
            if (m === "online" && mySymbolRef.current !== sym) return 0;
            const winnerSym = sym === "X" ? "O" : "X";
            setWinner(winnerSym);
            setScores((s) => ({ ...s, [winnerSym]: s[winnerSym] + 1 }));
            setGamePhase("over");
          }
          return 0;
        }
        return next;
      });
    }, 1000);
  }, []);

  // Start/reset timer on every turn change or game phase change
  useEffect(() => {
    if (gamePhase === "playing" && timerEnabled) {
      startTimer();
    } else {
      stopTimer();
    }
    return () => stopTimer();
  }, [gamePhase, currentSymbol, timerEnabled, startTimer, stopTimer]);

  // ---- Core move logic ----
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
        if (currentSymbol !== mySymbol) return;
        // Optimistic update: show the move instantly, server will confirm via opCode 2
        setBoard((prev) => {
          if (prev[index] !== null) return prev;
          const next = [...prev];
          next[index] = mySymbol;
          return next;
        });
        setCurrent(mySymbol === "X" ? "O" : "X");
        sendMove(index);
      } else {
        applyMove(index);
      }
    },
    [gamePhase, board, mode, currentSymbol, mySymbol, sendMove, applyMove],
  );

  // ---- Start / restart ----
  const handleStart = useCallback(
    async (nameX, nameO) => {
      setUserName(nameX);
      setPlayerNames({ X: nameX, O: nameO || "Searching..." });
      setScores(INITIAL_SCORES);
      resetRound();

      if (mode === "online") {
        // Quick Match
        try {
          if (match) await leaveMatch();
          setSearching(true);
          // Set 'connecting' — game starts only when STATE_SYNC confirms both players
          await findMatch(nameX, timerEnabled);
          setSearching(false);
          setGamePhase("connecting");
        } catch (e) {
          setSearching(false);
        }
      } else {
        setGamePhase("playing");
      }
    },
    [mode, findMatch, match, leaveMatch, timerEnabled],
  );

  const handleCreateRoom = useCallback(
    async (displayName, rmName) => {
      setUserName(displayName);
      setScores(INITIAL_SCORES);
      resetRound();
      setPlayerNames({ X: displayName, O: "Waiting..." });

      try {
        if (match) await leaveMatch();
        const result = await createRoom(rmName, displayName);
        setRoomCode(result.room_code);
        setRoomName(result.room_name);
        setGamePhase("waiting");
      } catch (e) {
        // Handle error silently or show UI feedback
      }
    },
    [match, leaveMatch, createRoom],
  );

  const handleBrowseRooms = useCallback((name) => {
    setUserName(name);
    setGamePhase("lobby");
  }, []);

  const handleJoinRoom = useCallback(
    async (matchId) => {
      const name = userName || "Player";
      try {
        if (match) await leaveMatch();
        await joinRoom(matchId, name);
        setGamePhase("playing");
      } catch (e) {
        // Join failed
      }
    },
    [match, leaveMatch, joinRoom, userName],
  );

  const handleJoinByCode = useCallback(
    async (code) => {
      const name = userName || "Player";
      try {
        if (match) await leaveMatch();
        await joinByCode(code, name);
        setGamePhase("playing");
      } catch (e) {
        // Join failed
      }
    },
    [match, leaveMatch, joinByCode, userName],
  );

  const resetRound = () => {
    setBoard(emptyBoard());
    setWinLine(null);
    setIsDraw(false);
    setWinner(null);
    setTimeLeft(TURN_SECONDS);
    prevGameOverRef.current = false;
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

  const handleNewGame = useCallback(async () => {
    if (mode === "online") {
      try {
        await leaveMatch();
      } catch (e) {
        // ignore
      }
    }
    resetRound();
    setScores(INITIAL_SCORES);
    setRoomCode(null);
    setRoomName(null);
    setMySymbol(null);
    setGamePhase("start");
  }, [mode, leaveMatch]);

  // ---- Cancel matchmaking / ghost-match timeout ----
  const cancelSearch = useCallback(async () => {
    setSearching(false);
    await handleNewGame();
  }, [handleNewGame]);

  // Ghost-match timeout: if still 'connecting' after 30s with no second player, bail out.
  // 30s matches the matchmaking window; handleNewGame is stable so this only fires once.
  useEffect(() => {
    if (gamePhase !== "connecting") return;
    const t = setTimeout(async () => {
      await handleNewGame();
    }, 30_000);
    return () => clearTimeout(t);
  }, [gamePhase, handleNewGame]);

  const isMyTurn = mode === "online" ? currentSymbol === mySymbol : undefined;
  const boardDisabled =
    gamePhase !== "playing" || (mode === "online" && !isMyTurn);

  return (
    <div className={styles.app}>
      {gamePhase === "start" ? (
        <StartScreen
          onStart={handleStart}
          onCreateRoom={handleCreateRoom}
          onBrowseRooms={handleBrowseRooms}
          connecting={connecting}
          mode={mode}
          onModeChange={setMode}
          error={nakamaError}
          timerEnabled={timerEnabled}
          onTimerToggle={() => setTimerEnabled((v) => !v)}
          searching={searching}
          onCancelSearch={cancelSearch}
        />
      ) : gamePhase === "lobby" ? (
        <div className={styles.lobbyWrapper}>
          <div className={styles.lobbyCard}>
            <div className={styles.lobbyHeader}>
              <h2 className={styles.lobbyTitle}>🎮 Game Lobby</h2>
              <p className={styles.lobbySubtitle}>Find a room to join</p>
            </div>
            <RoomLobby
              listRooms={listRooms}
              onJoinRoom={handleJoinRoom}
              onJoinByCode={handleJoinByCode}
              onBack={handleNewGame}
              connecting={connecting}
              error={nakamaError}
            />
          </div>
        </div>
      ) : gamePhase === "waiting" ? (
        <div className={styles.waitingWrapper}>
          <div className={styles.waitingCard}>
            <div className={styles.waitingIcon}>🏠</div>
            <h2 className={styles.waitingTitle}>{roomName || "Game Room"}</h2>
            <p className={styles.waitingSubtext}>
              Waiting for opponent to join...
            </p>
            <div className={styles.codeDisplay}>
              <span className={styles.codeLabel}>Room Code</span>
              <span className={styles.codeValue}>{roomCode}</span>
            </div>
            <p className={styles.codeHint}>Share this code with your friend!</p>
            <div className={styles.waitingPulse}>
              <span className={styles.dot} />
              <span className={styles.dot} />
              <span className={styles.dot} />
            </div>
            <button className={styles.btnSecondary} onClick={handleNewGame}>
              ✕ Cancel
            </button>
          </div>
        </div>
      ) : gamePhase === "connecting" ? (
        <div className={styles.waitingWrapper}>
          <div className={styles.waitingCard}>
            <div className={styles.waitingIcon}>🔗</div>
            <h2 className={styles.waitingTitle}>Connecting…</h2>
            <p className={styles.waitingSubtext}>
              Waiting for opponent to join the match
            </p>
            <div className={styles.waitingPulse}>
              <span className={styles.dot} />
              <span className={styles.dot} />
              <span className={styles.dot} />
            </div>
            <button className={styles.btnSecondary} onClick={handleNewGame}>
              ✕ Cancel
            </button>
          </div>
        </div>
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
            timeLeft={timerEnabled ? timeLeft : undefined}
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

          {mode === "online" && match && roomCode && (
            <p className={styles.matchInfo}>
              Room: <code>{roomCode}</code>
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
