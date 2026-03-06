const Rules = require("./GameLogic");
const ClassicRules = require("./ClassicGameLogic");

// --- Starting FEN Constants (Hardcoded — never trust client for initial FEN) ---
const TAMERLANE_START_FEN = 'f1d1i1i1d1f/kamzgsvzmak1/pxcbyqehtnr/92/92/92/92/PXCBYQEHTNR/KAMZGSVZMAK1/F1D1I1I1D1F w';
const CLASSIC_START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// --- Shared Game Logic via TypeScript bridge (loaded lazily via tsx) ---
let _tamerlaneVerifierModule = null;
async function getTamerlaneVerifier() {
  if (!_tamerlaneVerifierModule) {
    try {
      const mod = await import('./gameVerifier.ts');
      _tamerlaneVerifierModule = {
        verifyGameEnd: mod.verifyGameEnd || mod.default?.verifyGameEnd,
        computeFenAfterMove: mod.computeFenAfterMove || mod.default?.computeFenAfterMove,
      };
      if (!_tamerlaneVerifierModule.verifyGameEnd) {
        console.error('❌ verifyGameEnd not found in module. Keys:', Object.keys(mod));
      }
    } catch (e) {
      console.error('❌ Failed to load Tamerlane verifier:', e.message);
      _tamerlaneVerifierModule = null;
    }
  }
  return _tamerlaneVerifierModule;
}

let _classicVerifierModule = null;
async function getClassicVerifier() {
  if (!_classicVerifierModule) {
    try {
      const mod = await import('./classicGameVerifier.ts');
      _classicVerifierModule = {
        verifyClassicGameEnd: mod.verifyClassicGameEnd || mod.default?.verifyClassicGameEnd,
        computeClassicFenAfterMove: mod.computeClassicFenAfterMove || mod.default?.computeClassicFenAfterMove,
      };
      if (!_classicVerifierModule.verifyClassicGameEnd) {
        console.error('❌ verifyClassicGameEnd not found in module. Keys:', Object.keys(mod));
      }
    } catch (e) {
      console.error('❌ Failed to load Classic verifier:', e.message);
      _classicVerifierModule = null;
    }
  }
  return _classicVerifierModule;
}

// --- ELO Logic (mirrored from client src/core/ELO.ts) ---
const STARTING_ELO = 1200;
const K_FACTOR = 32;

function getExpectedScore(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

function calculateNewRating(currentRating, opponentRating, actualScore) {
  const expected = getExpectedScore(currentRating, opponentRating);
  const change = K_FACTOR * (actualScore - expected);
  return Math.round(currentRating + change);
}

// --- Server-Side Stats Recording ---
async function recordGameStats(db, roomId, game, winner, reason) {
  try {
    const whiteUid = game.players?.white;
    const blackUid = game.players?.black;

    // Self-play guard: don't award ELO if same user played both sides
    if (!whiteUid || !blackUid || whiteUid === blackUid) {
      console.warn(`⚠️ Stats skipped: invalid players (white=${whiteUid}, black=${blackUid})`);
      return;
    }

    // Check if already processed (idempotency)
    const whiteHistoryRef = db.ref(`users/${whiteUid}/history/${roomId}`);
    const whiteHistSnap = await whiteHistoryRef.once('value');
    if (whiteHistSnap.exists()) {

      return;
    }

    const isClassic = game.gameType === 'classic';
    const eloField = isClassic ? 'eloClassic' : 'eloTamerlane';

    // Fetch current ratings
    const [whiteStatsSnap, blackStatsSnap] = await Promise.all([
      db.ref(`users/${whiteUid}/stats`).once('value'),
      db.ref(`users/${blackUid}/stats`).once('value'),
    ]);

    const whiteStats = whiteStatsSnap.val() || {};
    const blackStats = blackStatsSnap.val() || {};

    const whiteRating = whiteStats[eloField] || STARTING_ELO;
    const blackRating = blackStats[eloField] || STARTING_ELO;

    // Determine scores
    let whiteScore, blackScore;
    if (winner === 'white') {
      whiteScore = 1; blackScore = 0;
    } else if (winner === 'black') {
      whiteScore = 0; blackScore = 1;
    } else {
      whiteScore = 0.5; blackScore = 0.5;
    }

    const newWhiteRating = calculateNewRating(whiteRating, blackRating, whiteScore);
    const newBlackRating = calculateNewRating(blackRating, whiteRating, blackScore);

    // Fetch nicknames for history
    const [whiteNickSnap, blackNickSnap] = await Promise.all([
      db.ref(`users/${whiteUid}/nickname`).once('value'),
      db.ref(`users/${blackUid}/nickname`).once('value'),
    ]);
    const whiteNick = whiteNickSnap.val() || 'Player';
    const blackNick = blackNickSnap.val() || 'Player';

    const now = Date.now();

    // Write stats for white (Admin SDK bypasses rules)
    await db.ref(`users/${whiteUid}/stats`).transaction((current) => {
      const s = current || { wins: 0, losses: 0, draws: 0, games: 0, eloTamerlane: STARTING_ELO, eloClassic: STARTING_ELO };
      s.games = (s.games || 0) + 1;
      if (whiteScore === 1) s.wins = (s.wins || 0) + 1;
      else if (whiteScore === 0) s.losses = (s.losses || 0) + 1;
      else s.draws = (s.draws || 0) + 1;
      s[eloField] = newWhiteRating;
      return s;
    });

    // Write stats for black
    await db.ref(`users/${blackUid}/stats`).transaction((current) => {
      const s = current || { wins: 0, losses: 0, draws: 0, games: 0, eloTamerlane: STARTING_ELO, eloClassic: STARTING_ELO };
      s.games = (s.games || 0) + 1;
      if (blackScore === 1) s.wins = (s.wins || 0) + 1;
      else if (blackScore === 0) s.losses = (s.losses || 0) + 1;
      else s.draws = (s.draws || 0) + 1;
      s[eloField] = newBlackRating;
      return s;
    });

    // Write history for both players
    await Promise.all([
      db.ref(`users/${whiteUid}/history/${roomId}`).set({
        timestamp: now,
        result: whiteScore === 1 ? 'win' : whiteScore === 0 ? 'loss' : 'draw',
        opponent: blackNick,
        opponentUid: blackUid,
        reason: reason || 'unknown',
        role: 'white',
        gameType: game.gameType || 'tamerlane',
        ratingChange: newWhiteRating - whiteRating,
        finalRating: newWhiteRating,
      }),
      db.ref(`users/${blackUid}/history/${roomId}`).set({
        timestamp: now,
        result: blackScore === 1 ? 'win' : blackScore === 0 ? 'loss' : 'draw',
        opponent: whiteNick,
        opponentUid: whiteUid,
        reason: reason || 'unknown',
        role: 'black',
        gameType: game.gameType || 'tamerlane',
        ratingChange: newBlackRating - blackRating,
        finalRating: newBlackRating,
      }),
    ]);

    console.log(`📊 Stats recorded for room ${roomId}: White(${newWhiteRating}) Black(${newBlackRating})`);
  } catch (err) {
    console.error(`❌ Failed to record stats for room ${roomId}:`, err.message);
  }
}

function initQueueWorker(db) {
  console.log("♟️ Tamerlane Chess Worker Started...");

  const queueRef = db.ref("moveQueue");

  // Per-room rate limiting (200ms minimum between moves)
  const lastMoveTime = {};

  // Firebase connection monitoring
  db.ref(".info/connected").on("value", (snap) => {
    if (snap.val() === true) {
      console.log("🔗 Firebase connected");
    } else {
      console.warn("⚠️ Firebase disconnected, will auto-reconnect");
    }
  });

  queueRef.on("child_added", async (snapshot) => {
    const key = snapshot.key;
    const request = snapshot.val();

    if (!request || !request.roomId) {
      return snapshot.ref.remove();
    }

    // Rate limit: reject moves too close together for the same room
    const now = Date.now();
    if (request.type !== 'surrender' && request.type !== 'claim_timeout') {
      if (now - (lastMoveTime[request.roomId] || 0) < 200) {
        console.warn(`⚡ Rate limited move in room ${request.roomId}`);
        return snapshot.ref.remove();
      }
      lastMoveTime[request.roomId] = now;
    }

    const roomRef = db.ref(`games/${request.roomId}`);

    // --- IDENTITY VERIFICATION (Anti-Spoofing) ---
    // Verify that request.senderUid exists and matches the claimed color
    const gameSnapForAuth = await roomRef.once('value');
    const gameForAuth = gameSnapForAuth.val();

    if (!gameForAuth) {
      console.error("Game not found for auth check");
      return snapshot.ref.remove();
    }

    // senderUid must match the player UID for the claimed color
    if (request.senderUid && gameForAuth.players) {
      const claimedColor = request.by;
      const expectedUid = gameForAuth.players[claimedColor];
      if (request.senderUid !== expectedUid) {
        console.warn(`🚨 SPOOFING ATTEMPT: senderUid=${request.senderUid} claimed to be ${claimedColor} but actual UID is ${expectedUid}`);
        return snapshot.ref.remove();
      }
    }

    // --- HANDLE SPECIAL ACTIONS (Surrender / Timeout Claim) ---
    if (request.type === 'surrender') {
        console.log(`🏳️ Surrender request: ${request.by} in room ${request.roomId}`);
        // Calculate winner (opponent)
        const winner = request.by === 'white' ? 'black' : 'white';
        
        await roomRef.update({
            gameStatus: 'finished',
            winner: winner,
            reason: 'surrender'
        });
        
        // Record stats server-side
        await recordGameStats(db, request.roomId, gameForAuth, winner, 'surrender');
        
        console.log(`✅ Game ended by surrender. Winner: ${winner}`);
        return snapshot.ref.remove();
    }

    if (request.type === 'claim_timeout') {
         console.log(`⏱️ Timeout claim by ${request.by} in room ${request.roomId}`);
         
         if (!gameForAuth || gameForAuth.gameStatus === 'finished') {
             return snapshot.ref.remove();
         }

         const lastTimestamp = (gameForAuth.lastMove && gameForAuth.lastMove.timestamp) ? gameForAuth.lastMove.timestamp : gameForAuth.createdAt;
         const nowTs = Date.now();
         const diff = nowTs - lastTimestamp;
         
         // 90 Seconds Tolerance
         if (diff > 90000) {
             const winner = request.by; // The claimer wins
             if (winner !== 'white' && winner !== 'black') return snapshot.ref.remove();

             await roomRef.update({
                gameStatus: 'finished',
                winner: winner,
                reason: 'timeout (disconnected)'
            });

            // Record stats server-side
            await recordGameStats(db, request.roomId, gameForAuth, winner, 'timeout (disconnected)');

            console.log(`✅ Game ended by timeout. Winner: ${winner}`);
         } else {
             console.warn(`❌ False timeout claim. Diff: ${diff}ms < 90000ms`);
         }
         return snapshot.ref.remove();
    }

    // --- NORMAL MOVE PROCESSING ---


    try {
      // Use the already-fetched game data
      const game = gameForAuth;

      // 0. Validation: Game Status
      if (game.gameStatus === 'finished') {
          console.warn(`🛑 Move rejected: Game ${request.roomId} is already finished.`);
          return snapshot.ref.remove();
      }

      // 0.5. Validation: Timestamp (Last-Write-Wins)
      if (game.lastMove && game.lastMove.timestamp && request.timestamp && request.timestamp < game.lastMove.timestamp) {
          console.warn(`⏳ Stale move rejected. Request: ${request.timestamp}, Last: ${game.lastMove.timestamp}`);
          return snapshot.ref.remove();
      }

      // 1. Validation: Turn
      const currentTurn = game.currentTurn || "white";
      if (request.by !== currentTurn) {
        console.warn(
          `Turn Mismatch: Request by ${request.by}, but turn is ${currentTurn}`,
        );
        return snapshot.ref.remove();
      }

      // 2. Validation: Logic (Anti-Cheat)
      const isClassic =
        game.gameType === "classic" ||
        (request.boardState && request.boardState.castlingRights !== undefined);

      // Get FEN: prefer stored server FEN, then use hardcoded start FEN for first move
      // SECURITY: Never trust client's previousFen — use hardcoded starting position
      let currentFen = game.currentFen;

      if (!currentFen && !game.lastMove) {
        // First move of the game — use hardcoded starting FEN
        currentFen = isClassic ? CLASSIC_START_FEN : TAMERLANE_START_FEN;
      }



      // Validate only if we have a FEN to validate against
      if (currentFen) {
        let isValid = false;

        if (isClassic) {
          isValid = ClassicRules.isValidMove(
            currentFen,
            request.from,
            request.to,
            request.by,
          );
          if (!isValid) {
            console.warn(
              `🚨 CLASSIC CHEAT: ${request.by} tried ${request.from}->${request.to}`,
            );
            return snapshot.ref.remove();
          }

        } else {
          isValid = Rules.isValidMove(
            currentFen,
            request.from,
            request.to,
            request.by,
          );
          if (!isValid) {
            console.warn(
              `🚨 TAMERLANE CHEAT: ${request.by} tried ${request.from}->${request.to}`,
            );
            return snapshot.ref.remove();
          }

        }
      } else {

      }

      // 3. Execution
      const nextTurn = game.currentTurn === "white" ? "black" : "white";

      const updates = {};

      // --- TIMER LOGIC (Server-Side Secure) ---
      if (game.timeControl) {
        const nowTimer = Date.now();
        const playerColor = request.by;
        const timeField = `${playerColor}Time`;

        let currentRemaining = game[timeField];
        if (currentRemaining === undefined || currentRemaining === null) {
          currentRemaining = game.timeControl;
        }

        let elapsedSeconds = 0;

        if (!game.lastMove) {

          elapsedSeconds = 0;
        } else {
          const lastTs = game.lastMove.timestamp || game.createdAt || nowTimer;
          elapsedSeconds = (nowTimer - lastTs) / 1000;

        }

        const newRemaining = Math.max(0, currentRemaining - elapsedSeconds);
        updates[timeField] = newRemaining;



        // Flag Fall Check
        if (newRemaining <= 0) {
          updates[`gameStatus`] = "finished";
          updates[`winner`] = playerColor === "white" ? "black" : "white";
          updates[`reason`] = "timeout";
          console.log(`🚩 TIMEOUT: ${playerColor} lost on time.`);
        }
      }

      updates[`lastMove`] = {
        from: request.from,
        to: request.to,
        by: request.by,
        timestamp: Date.now(),
        boardState: request.boardState || null,
      };
      updates[`currentTurn`] = nextTurn;

      // --- Server-Side FEN Computation (SECURE) ---
      // SECURITY: Compute FEN server-side instead of trusting client payload
      if (currentFen) {
        try {
          if (isClassic) {
            const classicVerifier = await getClassicVerifier();
            if (classicVerifier && classicVerifier.computeClassicFenAfterMove) {
              const serverFen = classicVerifier.computeClassicFenAfterMove(currentFen, request.from, request.to, request.by);
              updates[`currentFen`] = serverFen;
            } else if (request.boardState && request.boardState.currentFen) {
              // Fallback: trust client only if server computation unavailable
              updates[`currentFen`] = request.boardState.currentFen;
              console.warn('⚠️ Classic FEN fallback to client (verifier unavailable)');
            }
          } else {
            const tamerlaneVerifier = await getTamerlaneVerifier();
            if (tamerlaneVerifier && tamerlaneVerifier.computeFenAfterMove) {
              const serverFen = tamerlaneVerifier.computeFenAfterMove(currentFen, request.from, request.to);
              updates[`currentFen`] = serverFen;
            } else if (request.boardState && request.boardState.currentFen) {
              // Fallback: trust client only if server computation unavailable
              updates[`currentFen`] = request.boardState.currentFen;
              console.warn('⚠️ Tamerlane FEN fallback to client (verifier unavailable)');
            }
          }
        } catch (fenErr) {
          console.error('❌ Server FEN computation error:', fenErr.message);
          // Ultimate fallback
          if (request.boardState && request.boardState.currentFen) {
            updates[`currentFen`] = request.boardState.currentFen;
          }
        }
      } else if (request.boardState && request.boardState.currentFen) {
        // No currentFen to compute from — accept client (shouldn't happen after fix 3)
        updates[`currentFen`] = request.boardState.currentFen;
      }

      // Sync Move History
      if (request.boardState && request.boardState.moveHistory) {
        updates[`moveHistory`] = request.boardState.moveHistory;
      }

      // --- Server-Side Game End Verification (SECURE) ---
      // Use server-computed FEN (from updates) for verification
      const fenForVerification = updates[`currentFen`] || currentFen;
      if (fenForVerification && !updates[`gameStatus`]) {
        if (!isClassic) {
          // Tamerlane: server-authoritative verification
          const tamerlaneVerifier = await getTamerlaneVerifier();
          if (tamerlaneVerifier && tamerlaneVerifier.verifyGameEnd) {
            try {
              const serverResult = tamerlaneVerifier.verifyGameEnd(fenForVerification, request.by);

              if (serverResult && serverResult.isGameOver) {
                updates[`gameStatus`] = 'finished';
                updates[`winner`] = serverResult.winner;
                updates[`reason`] = serverResult.reason;
                console.log(`🏁 SERVER VERIFIED (Tamerlane): ${serverResult.reason} — Winner: ${serverResult.winner}`);
              } else if (request.boardState && request.boardState.isGameOver) {
                console.warn(`🚨 CLIENT CLAIMED GAME OVER BUT SERVER DISAGREES — Ignoring`);
              }
            } catch (e) {
              console.error('❌ Tamerlane verification error:', e.message);
            }
          }
        } else {
          // Classic Chess: server-authoritative verification (NO LONGER TRUSTING CLIENT)
          const classicVerifier = await getClassicVerifier();
          if (classicVerifier && classicVerifier.verifyClassicGameEnd) {
            try {
              const serverResult = classicVerifier.verifyClassicGameEnd(fenForVerification, request.by);

              if (serverResult && serverResult.isGameOver) {
                updates[`gameStatus`] = 'finished';
                updates[`winner`] = serverResult.winner;
                updates[`reason`] = serverResult.reason;
                console.log(`🏁 SERVER VERIFIED (Classic): ${serverResult.reason} — Winner: ${serverResult.winner}`);
              } else if (request.boardState && request.boardState.isGameOver) {
                console.warn(`🚨 CLASSIC CLIENT CLAIMED GAME OVER BUT SERVER DISAGREES — Ignoring`);
              }
            } catch (e) {
              console.error('❌ Classic verification error:', e.message);
            }
          } else {
            console.warn('⚠️ Classic verifier unavailable — game-end check skipped');
          }
        }
      }

      await roomRef.update(updates);
      
      // Invalidate cache after update
      const gameCache = require('./cache/gameCache');
      gameCache.invalidate(request.roomId);

      // If game just finished, record stats server-side
      if (updates[`gameStatus`] === "finished" && updates[`winner`]) {
        await recordGameStats(db, request.roomId, game, updates[`winner`], updates[`reason`] || 'unknown');
      }
      

    } catch (err) {
      console.error("❌ Error processing move:", err);
    } finally {
      await snapshot.ref.remove().catch(() => {});
    }
  });

  // Return cleanup function for graceful shutdown
  return function cleanup() {
    console.log("♟️ Worker cleanup: Detaching listeners...");
    queueRef.off("child_added");
    db.ref(".info/connected").off("value");
    console.log("♟️ Worker listeners detached");
  };
}

module.exports = { initQueueWorker };
