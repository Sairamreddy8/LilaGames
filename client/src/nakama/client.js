import { Client } from "@heroiclabs/nakama-js";

// Configure these to match your Nakama server settings
const NAKAMA_HOST = import.meta.env.VITE_NAKAMA_HOST || "localhost";
const NAKAMA_PORT = import.meta.env.VITE_NAKAMA_PORT || "7350";
const NAKAMA_SSL = import.meta.env.VITE_NAKAMA_SSL === "true";
const NAKAMA_KEY = import.meta.env.VITE_NAKAMA_SERVER_KEY || "defaultkey";

export const nakamaClient = new Client(
  NAKAMA_KEY,
  NAKAMA_HOST,
  NAKAMA_PORT,
  NAKAMA_SSL,
);

// ------- Thin auth helper -------
// Authenticates with device ID (stored in localStorage for persistence).
// Returns { session, account }
export async function authenticateDevice() {
  const deviceId = (() => {
    const stored = localStorage.getItem("lila_device_id");
    if (stored) return stored;
    const id = crypto.randomUUID();
    localStorage.setItem("lila_device_id", id);
    return id;
  })();

  const session = await nakamaClient.authenticateDevice(
    deviceId,
    true,
    `Player_${deviceId.slice(0, 6)}`,
  );
  const account = await nakamaClient.getAccount(session);
  return { session, account };
}

// ------- Socket helper -------
// Creates and connects a real-time socket for a given session.
export function createSocket() {
  return nakamaClient.createSocket(NAKAMA_SSL);
}
