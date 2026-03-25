/**
 * Pure game-logic helpers — mirrors the C++ TicTacToe backend logic.
 */

// All winning line combinations (mirrors checkWin rows/cols/diagonals)
export const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8], // rows
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8], // cols
  [0, 4, 8],
  [2, 4, 6], // diagonals
];

/**
 * Returns the winning line [a, b, c] if `symbol` wins, else null.
 * Mirrors: bool Board::checkWin(char symbol)
 */
export function checkWin(board, symbol) {
  return (
    WIN_LINES.find(
      ([a, b, c]) =>
        board[a] === symbol && board[b] === symbol && board[c] === symbol,
    ) ?? null
  );
}

/**
 * Returns true if all 9 cells are filled.
 * Mirrors: bool Board::isFull()
 */
export function isBoardFull(board) {
  return board.every((cell) => cell !== null);
}

/** Returns a fresh empty board. */
export function emptyBoard() {
  return Array(9).fill(null);
}
