import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { initFirebase } from "../firebaseConfig";

export interface OnlineState {
  isOnline: boolean;
  roomCode: string | null;
  playerColor: "white" | "black" | null;
  isSpectator: boolean;
  opponentConnected: boolean;
  currentTurn: "white" | "black";
  error: string | null;
  isConnecting: boolean;
  lastMove: { from: number; to: number; by: string; timestamp: number } | null;
  currentFen: string | null;
  gameStatus: "active" | "finished" | null;
  winner: "white" | "black" | "draw" | null;
  endReason: string | null;
  // Timer Fields
  whiteTime: number | null;
  blackTime: number | null;
  timeControl: number | null;
  createdAt: number | null;
  // Game Type
  // Game Type
  gameType: "tamerlane" | "classic" | null;
  // Classic Chess Board State
  boardState: any | null;
  opponentNickname: string | null;
  moveHistory: string[] | null; // Persisted move history
  connectionStatus: "connected" | "disconnected" | "reconnecting";
  opponentLastSeen: number | null;
  serverTimeOffset: number;
}

// Generate random room code
function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function useOnlineGame(targetRoomId?: string) {
  const { currentUser } = useAuth() || {};
  const { showToast } = useToast();
  const [state, setState] = useState<OnlineState>({
    isOnline: false,
    roomCode: null,
    playerColor: null,
    isSpectator: false,
    opponentConnected: false,
    currentTurn: "white",
    error: null,
    isConnecting: !!targetRoomId,
    lastMove: null,
    currentFen: null,
    gameStatus: null,
    winner: null,
    endReason: null,
    whiteTime: null,
    blackTime: null,
    timeControl: null,
    createdAt: null,
    gameType: null,
    boardState: null,
    opponentNickname: null,
    moveHistory: null,
    connectionStatus: "disconnected",
    opponentLastSeen: null,
    serverTimeOffset: 0,
  });

  const firebaseRef = useRef<any>(null);
  const roomRef = useRef<any>(null);
  const moveCallbackRef = useRef<((from: number, to: number) => void) | null>(
    null,
  );

  // Initialize Firebase once
  useEffect(() => {
    const waitForFirebase = () => {
      const w = window as any;
      if (!w.firebase) {
        setTimeout(waitForFirebase, 500);
        return;
      }
      initFirebase(w.firebase);
      firebaseRef.current = w.firebase.database();
    };
    waitForFirebase();
  }, []);

  // Connect to specific room if roomId is provided
  useEffect(() => {
    if (!targetRoomId || !currentUser || !firebaseRef.current) return;

    const connect = async () => {
      setState((p) => ({ ...p, isConnecting: true, error: null }));
      try {
        const roomPath = "games/" + targetRoomId;
        roomRef.current = firebaseRef.current.ref(roomPath);

        // Get room data
        const snapshot = await roomRef.current.once("value");
        if (!snapshot.exists()) {
          throw new Error("Room not found");
        }

        const data = snapshot.val();
        // Validate room data structure
        if (!data.players) {
          console.error("Room data missing players:", data);
          throw new Error("Invalid room data: Players missing");
        }

        let myColor: "white" | "black" | null = null;
        let isSpec = false;

        // Identity Check & Auto-Join
        if (data.players.white === currentUser.uid) {
          myColor = "white";
        } else if (data.players.black === currentUser.uid) {
          myColor = "black";
        } else if (!data.players.white || data.players.white === false) {
          await roomRef.current.child("players/white").set(currentUser.uid);
          await roomRef.current
            .child("nicknames/white")
            .set(currentUser.nickname || "Guest");
          myColor = "white";
          isSpec = false;
        } else if (!data.players.black || data.players.black === false) {
          await roomRef.current.child("players/black").set(currentUser.uid);
          await roomRef.current
            .child("nicknames/black")
            .set(currentUser.nickname || "Guest");
          myColor = "black";
          isSpec = false;
        } else {
          isSpec = true;
        }

        setState((p) => ({
          ...p,
          isOnline: true,
          roomCode: targetRoomId,
          playerColor: myColor,
          isSpectator: isSpec,
          currentTurn: data.currentTurn || "white",
          currentFen: data.currentFen || null,
          isConnecting: false,
          timeControl: data.timeControl || null,
          whiteTime: data.whiteTime ?? data.timeControl ?? null,
          blackTime: data.blackTime ?? data.timeControl ?? null,
          createdAt: data.createdAt || Date.now(),
          gameType: data.gameType || "tamerlane", // Read game type from room
          moveHistory: data.moveHistory || [],
        }));

        // Save current room and game type to user profile for invite system
        const userRef = firebaseRef.current.ref(`users/${currentUser.uid}`);
        await userRef.update({
          currentRoomId: targetRoomId,
          currentGameType: data.gameType || "tamerlane",
        });

        // ═══════════════════════════════════════════════════════════════
        // CONSOLIDATED ROOM LISTENER (replaces 10 separate child listeners)
        // Uses a single .on("value") on the entire room to minimize
        // Firebase connection count (from 13 → 4 per player).
        // ═══════════════════════════════════════════════════════════════
        let lastProcessedMoveTs = data.lastMove?.timestamp || 0;

        roomRef.current.on("value", (snap: any) => {
          const room = snap.val();
          if (!room) return;

          setState((p) => {
            // --- Players & Identity ---
            let newColor = p.playerColor;
            let newIsSpec = p.isSpectator;

            if (room.players) {
              // NOTE: opponentConnected is NOT set here — it is exclusively
              // managed by the presence listener to track actual online/offline
              // state (not just whether a UID exists in the players node).

              if (room.players.white === currentUser.uid) {
                newColor = "white";
                newIsSpec = false;
              } else if (room.players.black === currentUser.uid) {
                newColor = "black";
                newIsSpec = false;
              } else {
                newIsSpec = true;
              }
            }

            // --- Nicknames ---
            let oppNick = p.opponentNickname;
            if (room.nicknames) {
              oppNick =
                newColor === "white"
                  ? room.nicknames.black || null
                  : room.nicknames.white || null;
            }

            return {
              ...p,
              // Core game state
              currentTurn: room.currentTurn || p.currentTurn,
              gameStatus: room.gameStatus || p.gameStatus,
              winner: room.winner || p.winner,
              endReason: room.reason || p.endReason,
              moveHistory: room.moveHistory || p.moveHistory,
              // Move data
              lastMove: room.lastMove || p.lastMove,
              boardState: room.lastMove?.boardState || p.boardState,
              // Timers
              whiteTime: room.whiteTime ?? p.whiteTime,
              blackTime: room.blackTime ?? p.blackTime,
              // Players
              playerColor: newColor,
              isSpectator: newIsSpec,
              opponentNickname: oppNick,
            };
          });

          // --- Move callback (for opponent moves) ---
          if (
            room.lastMove &&
            room.lastMove.timestamp > lastProcessedMoveTs &&
            room.lastMove.by !== myColor
          ) {
            lastProcessedMoveTs = room.lastMove.timestamp;
            if (moveCallbackRef.current) {
              moveCallbackRef.current(room.lastMove.from, room.lastMove.to);
            }
          }

          // --- Game-End Cleanup: detach listener to free connections ---
          if (room.gameStatus === "finished" && roomRef.current) {
            // Keep a final snapshot in state, then stop listening
            roomRef.current.off("value");
          }
        });
      } catch (err: any) {
        console.error(err);
        setState((p) => ({ ...p, error: err.message, isConnecting: false }));
      }
    };

    // Wait a bit for firebaseRef to be ready if it's the first render
    if (firebaseRef.current) {
      connect();
    } else {
      setTimeout(connect, 1000);
    }

    return () => {
      if (roomRef.current) roomRef.current.off();
    };
  }, [targetRoomId, currentUser]);

  // Server Time Offset Sync
  useEffect(() => {
    if (!firebaseRef.current) return;
    const offsetRef = firebaseRef.current.ref(".info/serverTimeOffset");
    const listener = offsetRef.on("value", (snap: any) => {
      const offset = snap.val() || 0;
      setState((p) => ({ ...p, serverTimeOffset: offset }));
    });
    return () => offsetRef.off("value", listener);
  }, []);

  // Presence & Connection Monitoring
  useEffect(() => {
    if (
      !firebaseRef.current ||
      !state.roomCode ||
      !state.playerColor ||
      state.isSpectator ||
      state.gameStatus === "finished"
    )
      return;

    const connectedRef = firebaseRef.current.ref(".info/connected");
    const myPresenceRef = firebaseRef.current.ref(
      `games/${state.roomCode}/presence/${state.playerColor}`,
    );
    const opponentPresenceRef = firebaseRef.current.ref(
      `games/${state.roomCode}/presence/${state.playerColor === "white" ? "black" : "white"}`,
    );

    // Monitor my connection
    const connectedListener = connectedRef.on("value", (snap: any) => {
      if (snap.val() === true) {
        setState((p) => ({ ...p, connectionStatus: "connected" }));

        // Set presence logic
        myPresenceRef
          .onDisconnect()
          .update({
            state: "offline",
            lastSeen: (window as any).firebase.database.ServerValue.TIMESTAMP,
          })
          .then(() => {
            myPresenceRef.update({
              state: "online",
              lastSeen: (window as any).firebase.database.ServerValue.TIMESTAMP,
            });
          });
      } else {
        setState((p) => ({ ...p, connectionStatus: "disconnected" }));
      }
    });

    // Monitor opponent presence
    const opponentListener = opponentPresenceRef.on("value", (snap: any) => {
      const data = snap.val();
      if (data) {
        // If offline, track lastSeen
        if (data.state === "offline") {
          setState((p) => ({
            ...p,
            opponentConnected: false,
            opponentLastSeen: data.lastSeen,
          }));
        } else {
          setState((p) => ({
            ...p,
            opponentConnected: true,
            opponentLastSeen: null,
          }));
        }
      }
    });

    return () => {
      connectedRef.off("value", connectedListener);
      opponentPresenceRef.off("value", opponentListener);
      // Don't cancel onDisconnect here to ensure it fires if tab closes
    };
  }, [state.roomCode, state.playerColor, state.isSpectator, state.gameStatus]);

  // Create Room Action (Helper)
  const createRoom = useCallback(
    async (options?: {
      side?: "white" | "black" | "random";
      timeControl?: number | null;
      gameType?: "tamerlane" | "classic";
    }): Promise<string> => {
      if (!currentUser || !firebaseRef.current)
        throw new Error("Not authenticated or system not ready");

      const code = generateRoomCode();
      const roomRef = firebaseRef.current.ref("games/" + code);

      // Determine side
      let myColor = "white";
      if (options?.side === "black") myColor = "black";
      // If random, pick one.
      else if (options?.side === "random")
        myColor = Math.random() < 0.5 ? "white" : "black";
      // Default white

      const players = {
        white: myColor === "white" ? currentUser.uid : false,
        black: myColor === "black" ? currentUser.uid : false,
      };

      const roomData: any = {
        players,
        nicknames: {
          white: myColor === "white" ? currentUser.nickname || "Host" : false,
          black: myColor === "black" ? currentUser.nickname || "Host" : false,
        },
        currentTurn: "white", // White always moves first
        createdAt: (window as any).firebase.database.ServerValue.TIMESTAMP,
        gameType: options?.gameType || "tamerlane", // Default to Tamerlane if not specified
      };

      if (options?.timeControl) {
        roomData.timeControl = options.timeControl; // in seconds
        roomData.whiteTime = options.timeControl;
        roomData.blackTime = options.timeControl;
        // lastMoveTimestamp will be set on first move
      }

      await roomRef.set(roomData);

      return code;
    },
    [currentUser],
  );

  // Join Room Action (Helper)
  const joinRoom = useCallback(
    async (code: string): Promise<boolean> => {
      if (!currentUser || !firebaseRef.current)
        throw new Error("Not authenticated");

      const roomRef = firebaseRef.current.ref("games/" + code);
      const snap = await roomRef.once("value");

      if (!snap.exists()) throw new Error("Room not found");

      const data = snap.val();

      if (!data.players) throw new Error("Invalid room: No players data");

      // Re-join check: already in this room
      if (
        data.players.white === currentUser.uid ||
        data.players.black === currentUser.uid
      )
        return true;

      // Check if room is full
      if (data.players.white && data.players.black)
        throw new Error("Room is full");

      // Join the open slot
      if (!data.players.white || data.players.white === false) {
        await roomRef.child("players/white").set(currentUser.uid);
        await roomRef
          .child("nicknames/white")
          .set(currentUser.nickname || "Guest");
      } else {
        await roomRef.child("players/black").set(currentUser.uid);
        await roomRef
          .child("nicknames/black")
          .set(currentUser.nickname || "Guest");
      }

      return true;
    },
    [currentUser],
  );

  const sendMove = useCallback(
    (from: number, to: number, extraPayload?: any) => {
      if (
        !roomRef.current ||
        state.isSpectator ||
        !state.playerColor ||
        !state.roomCode ||
        !currentUser
      )
        return;

      // SECURE MODE: Send request to Server Queue (Node.js on Fly.io)
      const firebase = (window as any).firebase;
      const queueRef = firebase.database().ref("moveQueue");

      const attemptSend = async (retries = 5, delayMs = 1000) => {
        try {
          await queueRef.push({
            roomId: state.roomCode,
            from,
            to,
            by: state.playerColor,
            senderUid: currentUser.uid,
            boardState: extraPayload, // Server needs this to validate or sync
            timestamp: firebase.database.ServerValue.TIMESTAMP,
          });
          // Success - no action needed, UI updates via listeners
        } catch (err: any) {
          console.warn(`Move send failed. Retries left: ${retries}`, err);
          if (retries > 0) {
            showToast("Connection unstable, retrying move...", "info");
            setTimeout(() => attemptSend(retries - 1, delayMs * 2), delayMs);
          } else {
            console.error("Failed to send move:", err);
            showToast("Network Error: Could not reach game server.", "error");
          }
        }
      };

      attemptSend();
    },
    [state.isSpectator, state.playerColor, state.roomCode],
  );

  const onMoveReceived = useCallback(
    (cb: (from: number, to: number) => void) => {
      moveCallbackRef.current = cb;
    },
    [],
  );

  // Surrender Action
  const surrender = useCallback(async () => {
    if (!roomRef.current || !state.roomCode || !state.playerColor || !currentUser) return;

    // SECURE MODE: Push to queue instead of direct update
    const firebase = (window as any).firebase;
    if (firebaseRef.current && firebase) {
      await firebaseRef.current.ref("moveQueue").push({
        type: "surrender",
        roomId: state.roomCode,
        by: state.playerColor,
        senderUid: currentUser.uid,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
      });
    }
  }, [state.roomCode, state.playerColor]);

  // Timeout Action
  const loseOnTime = useCallback(async () => {
    if (
      !roomRef.current ||
      !state.roomCode ||
      !state.playerColor ||
      !currentUser ||
      state.gameStatus === "finished"
    )
      return;

    // SECURE MODE: Push timeout claim to queue
    const firebase = (window as any).firebase;
    if (firebaseRef.current && firebase) {
      await firebaseRef.current.ref("moveQueue").push({
        type: "claim_timeout",
        roomId: state.roomCode,
        by: state.playerColor, // I am claiming victory
        senderUid: currentUser.uid,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
      });
    }
  }, [state.roomCode, state.playerColor, state.gameStatus]);

  // Setup Disconnect Handler (Auto-Forfeit)
  useEffect(() => {
    if (
      !roomRef.current ||
      !state.playerColor ||
      !state.roomCode ||
      state.gameStatus === "finished"
    )
      return;

    const setupDisconnect = async () => {
      // If opponent is connected, disconnecting = forfeit.
      // If waiting, disconnecting = leave/remove.
      if (state.opponentConnected) {
        // COMMENTED OUT TO ALLOW REFRESH (F5) - User requested no auto-loss
        /*
                const winner = state.playerColor === 'white' ? 'black' : 'white';
                await roomRef.current.onDisconnect().update({
                    gameStatus: 'finished',
                    winner: winner,
                    reason: 'disconnected'
                });
                */
        // Instead just ensure presence system handles connection status
      } else {
        await roomRef.current
          .child(`players/${state.playerColor}`)
          .onDisconnect()
          .remove();
      }
    };

    setupDisconnect();

    return () => {
      // Cleanup: Cancel the onDisconnect if we unmount safely (e.g. navigation)
      // NOTE: If you revert F5 persistence, comment this .cancel() out.
      // But to support "Offline Loss", we rely on the server detecting the socket drop.
      // If we nav away, we should probably handle it explicitly via UI "Leave" button.
      // Here we just manage the socket rule.
      if (roomRef.current) {
        roomRef.current.onDisconnect().cancel();
        roomRef.current
          .child(`players/${state.playerColor}`)
          .onDisconnect()
          .cancel();
      }
    };
  }, [
    state.isOnline,
    state.playerColor,
    state.opponentConnected,
    state.roomCode,
    state.gameStatus,
  ]);

  // Statistics Recording is now handled server-side in worker.js
  // (Admin SDK bypasses locked Firebase rules for stats/history)

  // Sync Status to User Profile (Playing vs Online)
  useEffect(() => {
    if (!currentUser || !firebaseRef.current) return;

    const userStatusRef = firebaseRef.current.ref(`users/${currentUser.uid}`);

    // Check if we are physically in a room as a player (Host or Joined)
    const inRoom = state.isOnline && !state.isSpectator && state.roomCode;

    if (inRoom) {
      userStatusRef.update({
        status: state.opponentConnected ? "playing" : "online",
        currentRoomId: state.roomCode,
      });
    } else {
      userStatusRef.update({
        status: "online",
        currentRoomId: null,
      });
    }

    // Cleanup on unmount (leave game)
    return () => {
      userStatusRef.update({
        status: "online",
        currentRoomId: null,
      });
    };
  }, [
    currentUser,
    state.isOnline,
    state.isSpectator,
    state.opponentConnected,
    state.roomCode,
  ]);

  // Timeout Check (90s Rule) - Only runs when opponent is DISCONNECTED
  useEffect(() => {
    if (
      !state.isOnline ||
      state.gameStatus === "finished" ||
      state.opponentConnected ||
      !state.opponentLastSeen
    )
      return;

    const checkTimeout = () => {
      const now = Date.now();
      const lastSeen = state.opponentLastSeen || now; // fallback
      const diff = now - lastSeen;

      if (diff > 90000) {
        // 90 seconds
        // Claim Victory
        // SECURE MODE: Push timeout claim to queue
        const firebase = (window as any).firebase;
        if (firebase && currentUser) {
          firebase.database().ref("moveQueue").push({
            type: "claim_timeout",
            roomId: state.roomCode,
            by: state.playerColor,
            senderUid: currentUser.uid,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
          });
        }
      }
    };

    const interval = setInterval(checkTimeout, 5000); // Check every 5s
    return () => clearInterval(interval);
  }, [
    state.isOnline,
    state.gameStatus,
    state.opponentConnected,
    state.opponentLastSeen,
    state.playerColor,
  ]);

  return {
    state,
    createRoom,
    joinRoom,
    sendMove,
    onMoveReceived,
    surrender,
    loseOnTime,
  };
}
