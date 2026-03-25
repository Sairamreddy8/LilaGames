import styles from "./StatusBar.module.css";

/**
 * Shows current turn, winner, or draw.
 * Props:
 *  currentSymbol — 'X' | 'O'
 *  playerNames   — { X: string, O: string }
 *  winner        — null | 'X' | 'O'
 *  isDraw        — bool
 *  isMyTurn      — bool (for multiplayer awareness)
 */
export default function StatusBar({
  currentSymbol,
  playerNames,
  winner,
  isDraw,
  isMyTurn,
}) {
  let message;
  let accentClass = currentSymbol === "X" ? styles.accentX : styles.accentO;

  if (winner) {
    const name = playerNames[winner] ?? `Player ${winner}`;
    accentClass = winner === "X" ? styles.accentX : styles.accentO;
    message = (
      <>
        <span className={`${styles.symbol} ${accentClass}`}>{winner}</span>
        <span className={styles.text}> {name} wins! 🎉</span>
      </>
    );
  } else if (isDraw) {
    message = <span className={styles.text}>It&apos;s a draw! 🤝</span>;
  } else {
    const name = playerNames[currentSymbol] ?? `Player ${currentSymbol}`;
    message = (
      <>
        <span className={`${styles.symbol} ${accentClass}`}>
          {currentSymbol}
        </span>
        <span className={styles.text}>
          {" "}
          {name}&apos;s turn
          {isMyTurn !== undefined &&
            (isMyTurn ? " — your move" : " — waiting…")}
        </span>
      </>
    );
  }

  return (
    <div className={`${styles.bar} ${winner || isDraw ? styles.result : ""}`}>
      {message}
    </div>
  );
}
