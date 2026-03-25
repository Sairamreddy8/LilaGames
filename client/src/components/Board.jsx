import Cell from "./Cell";
import styles from "./Board.module.css";

/**
 * Renders the 3x3 game grid.
 * Props:
 *  board       — 9-element array of null/'X'/'O'
 *  onCellClick — callback(index)
 *  winLine     — [a,b,c] winning cell indices or null
 *  disabled    — bool: block all input
 */
export default function Board({ board, onCellClick, winLine, disabled }) {
  return (
    <div className={styles.grid}>
      {board.map((value, i) => (
        <Cell
          key={i}
          value={value}
          onClick={() => onCellClick(i)}
          isWinning={winLine?.includes(i) ?? false}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
