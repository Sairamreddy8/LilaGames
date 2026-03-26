import styles from "./StartScreen.module.css";
import { useState } from "react";
import PlayIcon from "../assets/game-media-movie-music-play-player-svgrepo-com.svg";
import RoomIcon from "../assets/room-svgrepo-com.svg";
import SearchIcon from "../assets/search-svgrepo-com.svg";

/**
 * Player name entry screen shown before the game starts.
 * Props:
 *  onStart(nameX, nameO)       — callback for local / quick match
 *  onCreateRoom(name, roomName) — callback for room creation
 *  onBrowseRooms()             — callback to show room lobby
 *  connecting                  — bool (show spinner while Nakama connects)
 *  mode                        — 'local' | 'online'
 *  onModeChange(mode)          — callback
 *  error                       — string | null (Nakama connection error)
 */
export default function StartScreen({
  onStart,
  onCreateRoom,
  onBrowseRooms,
  connecting,
  mode,
  onModeChange,
  error,
}) {
  const [nameX, setNameX] = useState("");
  const [nameO, setNameO] = useState("");
  const [roomName, setRoomName] = useState("");
  const [onlineAction, setOnlineAction] = useState(null); // null | 'quick' | 'create' | 'browse'

  const handleQuickMatch = (e) => {
    e.preventDefault();
    onStart(nameX.trim() || "Player X", "");
  };

  const handleCreateRoom = (e) => {
    e.preventDefault();
    onCreateRoom(nameX.trim() || "Player X", roomName.trim() || "Game Room");
  };

  const handleLocalStart = (e) => {
    e.preventDefault();
    onStart(nameX.trim() || "Player X", nameO.trim() || "Player O");
  };

  const nameValid = nameX.trim().length > 0;

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.x}>X</span>
          <span className={styles.divider}>/</span>
          <span className={styles.o}>O</span>
        </div>
        <h1 className={styles.title}>Tic-Tac-Toe</h1>
        <p className={styles.subtitle}>Play with friends!</p>

        {/* Mode toggle */}
        <div className={styles.modeToggle}>
          <button
            className={`${styles.modeBtn} ${mode === "local" ? styles.active : ""}`}
            onClick={() => {
              onModeChange("local");
              setOnlineAction(null);
            }}
            type="button"
          >
            Local 2P
          </button>
          <button
            className={`${styles.modeBtn} ${mode === "online" ? styles.active : ""}`}
            onClick={() => onModeChange("online")}
            type="button"
          >
            Online
          </button>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        {/* Name input — always shown */}
        <div className={styles.form}>
          <div className={styles.field}>
            <label className={styles.labelX} htmlFor="nameX">
              Your Name
            </label>
            <input
              id="nameX"
              className={styles.input}
              placeholder="Enter name…"
              value={nameX}
              onChange={(e) => setNameX(e.target.value)}
              maxLength={20}
            />
          </div>

          {/* === LOCAL MODE === */}
          {mode === "local" && (
            <>
              <div className={styles.field}>
                <label className={styles.labelO} htmlFor="nameO">
                  Player O
                </label>
                <input
                  id="nameO"
                  className={styles.input}
                  placeholder="Enter name…"
                  value={nameO}
                  onChange={(e) => setNameO(e.target.value)}
                  maxLength={20}
                />
              </div>
              <button
                className={styles.startBtn}
                onClick={handleLocalStart}
                disabled={!nameValid || !nameO.trim()}
                type="button"
              >
                Start Game
              </button>
            </>
          )}

          {/* === ONLINE MODE === */}
          {mode === "online" && !onlineAction && (
            <div className={styles.onlineActions}>
              <button
                className={styles.actionBtn}
                onClick={() => handleQuickMatch({ preventDefault: () => {} })}
                disabled={connecting || !nameValid}
                type="button"
              >
                <img
                  src={PlayIcon}
                  className={styles.actionIcon}
                  alt="Quick Match"
                />
                <span className={styles.actionLabel}>Quick Match</span>
                <span className={styles.actionHint}>Random opponent</span>
              </button>
              <button
                className={styles.actionBtn}
                onClick={() => setOnlineAction("create")}
                disabled={connecting || !nameValid}
                type="button"
              >
                <img
                  src={RoomIcon}
                  className={styles.actionIcon}
                  alt="Create Room"
                />
                <span className={styles.actionLabel}>Create Room</span>
                <span className={styles.actionHint}>Invite a friend</span>
              </button>
              <button
                className={styles.actionBtn}
                onClick={() => {
                  if (!nameValid) return;
                  onBrowseRooms(nameX.trim());
                }}
                disabled={connecting || !nameValid}
                type="button"
              >
                <img
                  src={SearchIcon}
                  className={styles.actionIcon}
                  alt="Browse Rooms"
                />
                <span className={styles.actionLabel}>Browse Rooms</span>
                <span className={styles.actionHint}>or join by code</span>
              </button>
            </div>
          )}

          {/* Create Room sub-form */}
          {mode === "online" && onlineAction === "create" && (
            <>
              <div className={styles.field}>
                <label className={styles.labelRoom} htmlFor="roomName">
                  Room Name
                </label>
                <input
                  id="roomName"
                  className={styles.input}
                  placeholder="My Game Room"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  maxLength={30}
                  autoFocus
                />
              </div>
              <button
                className={styles.startBtn}
                onClick={handleCreateRoom}
                disabled={connecting || !nameValid}
                type="button"
              >
                {connecting ? "Creating..." : "Create Room"}
              </button>
              <button
                className={styles.backLink}
                onClick={() => setOnlineAction(null)}
                type="button"
              >
                ← Back to options
              </button>
            </>
          )}

          {connecting && mode === "online" && !onlineAction && (
            <div className={styles.connectingMsg}>Connecting...</div>
          )}
        </div>
      </div>
    </div>
  );
}
