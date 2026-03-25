import styles from "./Cell.module.css";

/**
 * A single cell in the Tic-Tac-Toe grid.
 * Props:
 *  value       — null | 'X' | 'O'
 *  onClick     — callback
 *  isWinning   — bool: highlight as part of winning line
 *  disabled    — bool: prevent clicking
 */
export default function Cell({ value, onClick, isWinning, disabled }) {
  return (
    <button
      className={[
        styles.cell,
        value === "X" ? styles.x : "",
        value === "O" ? styles.o : "",
        isWinning ? styles.winning : "",
        disabled ? styles.disabled : "",
      ].join(" ")}
      onClick={onClick}
      disabled={disabled || value !== null}
      aria-label={value ?? "Empty cell"}
    >
      {value && (
        <span className={styles.symbol} key={value}>
          {value}
        </span>
      )}
    </button>
  );
}
