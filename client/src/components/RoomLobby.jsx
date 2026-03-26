import { useState, useEffect, useCallback } from "react";
import styles from "./RoomLobby.module.css";

/**
 * Room lobby component for browsing rooms and joining by code.
 * Props:
 *  listRooms()           — async, returns array of rooms
 *  onJoinRoom(matchId)   — callback when user clicks Join
 *  onJoinByCode(code)    — callback when user enters a code
 *  onBack()              — go back to main menu
 *  connecting            — bool, loading state
 *  error                 — string | null
 */
export default function RoomLobby({
  listRooms,
  onJoinRoom,
  onJoinByCode,
  onBack,
  connecting,
  error,
}) {
  const [activeTab, setActiveTab] = useState("browse"); // 'browse' | 'code'
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [fetchError, setFetchError] = useState(null);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const result = await listRooms();
      setRooms(result || []);
    } catch (e) {
      setFetchError(e.message || "Failed to load rooms");
    } finally {
      setLoading(false);
    }
  }, [listRooms]);

  // Auto-fetch rooms on mount and when switching to browse tab
  useEffect(() => {
    if (activeTab === "browse") {
      fetchRooms();
    }
  }, [activeTab, fetchRooms]);

  const handleCodeSubmit = (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    onJoinByCode(code.trim().toUpperCase());
  };

  const displayError = error || fetchError;

  return (
    <div className={styles.lobbyContainer}>
      {/* Tab bar */}
      <div className={styles.tabBar}>
        <button
          className={`${styles.tab} ${activeTab === "browse" ? styles.active : ""}`}
          onClick={() => setActiveTab("browse")}
          type="button"
        >
          🎮 Browse Rooms
        </button>
        <button
          className={`${styles.tab} ${activeTab === "code" ? styles.active : ""}`}
          onClick={() => setActiveTab("code")}
          type="button"
        >
          🔑 Join by Code
        </button>
      </div>

      {displayError && <p className={styles.error}>⚠ {displayError}</p>}

      {/* Browse tab */}
      {activeTab === "browse" && (
        <>
          <div className={styles.refreshRow}>
            <button
              className={styles.refreshBtn}
              onClick={fetchRooms}
              disabled={loading}
              type="button"
            >
              <span className={loading ? styles.spinning : ""}>↻</span>
              Refresh
            </button>
          </div>

          {loading ? (
            <div className={styles.loading}>Loading rooms...</div>
          ) : rooms.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🏠</div>
              <p>No rooms available right now.</p>
              <p>Create one or try Quick Match!</p>
            </div>
          ) : (
            <div className={styles.roomList}>
              {rooms.map((room) => (
                <div key={room.match_id} className={styles.roomCard}>
                  <div className={styles.roomInfo}>
                    <span className={styles.roomName}>{room.room_name}</span>
                    <div className={styles.roomMeta}>
                      <span className={styles.roomCode}>{room.room_code}</span>
                      <span className={styles.playerCount}>
                        <span className={styles.playerDot} />
                        {room.player_count}/2
                      </span>
                      {room.creator && <span>by {room.creator}</span>}
                    </div>
                  </div>
                  <button
                    className={styles.joinBtn}
                    onClick={() => onJoinRoom(room.match_id)}
                    disabled={connecting || room.player_count >= 2}
                  >
                    {room.player_count >= 2 ? "Full" : "Join"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Join by Code tab */}
      {activeTab === "code" && (
        <form onSubmit={handleCodeSubmit} className={styles.codeForm}>
          <div className={styles.codeInputGroup}>
            <input
              className={styles.codeInput}
              type="text"
              placeholder="ABCD12"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              autoFocus
            />
            <button
              className={styles.codeJoinBtn}
              type="submit"
              disabled={connecting || code.trim().length < 4}
            >
              {connecting ? "⏳" : "Join →"}
            </button>
          </div>
          <p className={styles.codeHint}>
            Enter the 6-character room code shared by your friend
          </p>
        </form>
      )}

      {/* Back button */}
      <button className={styles.backBtn} onClick={onBack} type="button">
        ← Back
      </button>
    </div>
  );
}
