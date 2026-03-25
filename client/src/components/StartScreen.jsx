import { useState } from "react";
import styles from "./StartScreen.module.css";

/**
 * Player name entry screen shown before the game starts.
 * Props:
 *  onStart(nameX, nameO) — callback with entered names
 *  connecting            — bool (show spinner while Nakama connects)
 *  mode                  — 'local' | 'online'
 *  onModeChange(mode)    — callback
 *  error                 — string | null (Nakama connection error)
 */
export default function StartScreen({
  onStart,
  connecting,
  mode,
  onModeChange,
  error,
}) {
  const [nameX, setNameX] = useState("");
  const [nameO, setNameO] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onStart(nameX.trim() || "Player X", nameO.trim() || "Player O");
  };

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
            onClick={() => onModeChange("local")}
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

        {error && <p className={styles.error}>⚠ {error}</p>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.labelX} htmlFor="nameX">
              Player X
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

          {mode === "local" && (
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
          )}

          <button
            className={styles.startBtn}
            type="submit"
            disabled={
              connecting || !nameX.trim() || (mode === "local" && !nameO.trim())
            }
          >
            {connecting
              ? "⏳ Connecting…"
              : mode === "online"
                ? "Find Match"
                : "Start Game"}
          </button>
        </form>
      </div>
    </div>
  );
}
