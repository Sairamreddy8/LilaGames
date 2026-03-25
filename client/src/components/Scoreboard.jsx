import styles from "./Scoreboard.module.css";

/**
 * Displays persistent win/draw tallies across rounds.
 * Props:
 *  scores      — { X: number, O: number, draws: number }
 *  playerNames — { X: string, O: string }
 */
export default function Scoreboard({ scores, playerNames }) {
  return (
    <div className={styles.board}>
      <div className={`${styles.col} ${styles.x}`}>
        <span className={styles.label}>{playerNames.X || "Player X"}</span>
        <span className={styles.count}>{scores.X}</span>
      </div>
      <div className={styles.col}>
        <span className={styles.label}>Draws</span>
        <span className={`${styles.count} ${styles.drawCount}`}>
          {scores.draws}
        </span>
      </div>
      <div className={`${styles.col} ${styles.o}`}>
        <span className={styles.label}>{playerNames.O || "Player O"}</span>
        <span className={styles.count}>{scores.O}</span>
      </div>
    </div>
  );
}
