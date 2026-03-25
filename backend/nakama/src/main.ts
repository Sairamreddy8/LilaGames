import { MatchHandler } from "./match_handler";

export function InitModule(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  initializer: nkruntime.Initializer,
) {
  logger.info("Initializing Tic-Tac-Toe module...");
  initializer.registerMatch("tictactoe", MatchHandler);
  logger.info("Tic-Tac-Toe match handler registered.");
}
