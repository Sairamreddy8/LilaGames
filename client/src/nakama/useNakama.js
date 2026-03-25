import { useState, useEffect, useCallback, useRef } from "react";
import { authenticateDevice, createSocket } from "./client";

/**
 * useNakama — manages Nakama session, socket, and matchmaking.
 *
 * Exposes:
 *  - session / account  : current auth state
 *  - socket             : connected real-time socket (or null)
 *  - match              : active match object (or null)
 *  - connecting         : loading flag
 *  - error              : last error string
 *  - findMatch()        : joins matchmaking pool and waits for a match
 *  - leaveMatch()       : leaves the current match
 *  - sendMove(index)    : sends a move via match data (opcode 1)
 */
export function useNakama() {
  const [session, setSession] = useState(null);
  const [account, setAccount] = useState(null);
  const [socket, setSocket] = useState(null);
  const [match, setMatch] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  // Callbacks that the game layer registers to react to incoming events
  const onMatchDataRef = useRef(null);
  const onMatchPresenceRef = useRef(null);

  // ---- Auth on mount ----
  useEffect(() => {
    let cancelled = false;
    setConnecting(true);

    authenticateDevice()
      .then(({ session: s, account: a }) => {
        if (cancelled) return;
        setSession(s);
        setAccount(a);

        // Connect socket
        const sock = createSocket();
        sock.onmatchdata = (data) => onMatchDataRef.current?.(data);
        sock.onmatchpresence = (evt) => onMatchPresenceRef.current?.(evt);
        sock.ondisconnect = () => setSocket(null);

        return sock.connect(s, true).then(() => {
          if (!cancelled) setSocket(sock);
        });
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? String(err));
      })
      .finally(() => {
        if (!cancelled) setConnecting(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const [matchmakerTicket, setMatchmakerTicket] = useState(null);

  // ---- Matchmaking ----
  const findMatch = useCallback(
    async (name) => {
      if (!socket) throw new Error("Socket not connected");

      // Clean up any existing ticket before adding a new one
      if (matchmakerTicket) {
        try {
          await socket.removeMatchmaker(matchmakerTicket);
        } catch (e) {
          console.warn("Error removing old ticket:", e);
        }
        setMatchmakerTicket(null);
      }

      setConnecting(true);

      try {
        const promise = new Promise((resolve, reject) => {
          socket.onmatchmakermatched = async (matched) => {
            console.log("Matchmaker matched!", matched);
            // Clear the local ticket state as it's been consumed or will be replaced
            setMatchmakerTicket(null);

            try {
              const m = await socket.joinMatch(
                matched.match_id || null,
                matched.token || null,
                { name },
              );
              resolve(m);
            } catch (e) {
              reject(e);
            }
          };

          setTimeout(() => {
            socket.onmatchmakermatched = null;
            reject(new Error("Matchmaking timeout (30s)"));
          }, 30_000);
        });

        const ticketObj = await socket.addMatchmaker("*", 2, 2);
        setMatchmakerTicket(ticketObj.ticket);

        const matchedMatch = await promise;
        setMatch(matchedMatch);
        return matchedMatch;
      } finally {
        setConnecting(false);
      }
    },
    [socket, matchmakerTicket],
  );

  // ---- Leave match ----
  const leaveMatch = useCallback(async () => {
    if (!socket) return;

    // 1. Leave current match if any
    if (match) {
      await socket.leaveMatch(match.match_id);
      setMatch(null);
    }

    // 2. Also clear matchmaking ticket if it exists
    if (matchmakerTicket) {
      try {
        await socket.removeMatchmaker(matchmakerTicket);
      } catch (e) {
        console.warn("Failed to remove ticket on leave:", e);
      }
      setMatchmakerTicket(null);
    }
  }, [socket, match, matchmakerTicket]);

  // ---- Send a move ----
  // opcode 1 = player move, data = { index: 0-8 }
  const sendMove = useCallback(
    async (index) => {
      if (!socket || !match) return;
      const data = JSON.stringify({ index });
      await socket.sendMatchState(match.match_id, 1, data);
    },
    [socket, match],
  );

  return {
    session,
    account,
    socket,
    match,
    connecting,
    error,
    findMatch,
    leaveMatch,
    sendMove,
    socket,
    // Let consumers register event handlers
    onMatchDataRef,
    onMatchPresenceRef,
  };
}
