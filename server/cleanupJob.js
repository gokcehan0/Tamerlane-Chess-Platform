/**
 * Cleanup Job
 * Periodically removes old finished games from Firebase
 * Runs every 6 hours, deletes games finished more than 48 hours ago
 */

// Store cleanup interval reference for shutdown
let cleanupInterval = null;

/**
 * Initialize cleanup job
 * @param {object} db - Firebase database instance
 */
function initCleanupJob(db) {
    console.log("🧹 Game cleanup job initialized");
    
    // Run immediately on startup
    runCleanup(db);
    
    // Then run every 6 hours
    cleanupInterval = setInterval(() => runCleanup(db), 6 * 60 * 60 * 1000);
}

/**
 * Run cleanup
 * @param {object} db - Firebase database instance
 */
async function runCleanup(db) {
    const now = Date.now();
    const cutoffTime = now - (48 * 60 * 60 * 1000); // 48 hours ago
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    
    console.log(`🧹 Running game cleanup (cutoff: ${new Date(cutoffTime).toISOString()})`);
    
    try {
        const gamesRef = db.ref('games');
        let deletedCount = 0;
        
        // 1. Clean finished games older than 48 hours (query-based, batched)
        const finishedSnap = await gamesRef
            .orderByChild('gameStatus')
            .equalTo('finished')
            .limitToFirst(200)
            .once('value');
        
        const finishedGames = finishedSnap.val();
        if (finishedGames) {
            const deletePromises = [];
            Object.entries(finishedGames).forEach(([roomId, game]) => {
                const lastActivity = game.lastMove?.timestamp || game.createdAt || 0;
                if (lastActivity < cutoffTime) {
                    deletePromises.push(
                        db.ref(`games/${roomId}`).remove()
                            .then(() => { deletedCount++; })
                            .catch(err => console.error(`🧹 Failed to delete ${roomId}:`, err.message))
                    );
                }
            });
            await Promise.all(deletePromises);
        }
        
        // 2. Clean abandoned games (no activity for 7 days, not finished)
        // Use createdAt index for ordering — pick old ones
        const oldSnap = await gamesRef
            .orderByChild('createdAt')
            .endAt(sevenDaysAgo)
            .limitToFirst(200)
            .once('value');
        
        const oldGames = oldSnap.val();
        if (oldGames) {
            const deletePromises = [];
            Object.entries(oldGames).forEach(([roomId, game]) => {
                if (game.gameStatus !== 'finished') {
                    const lastActivity = game.lastMove?.timestamp || game.createdAt || 0;
                    if (lastActivity < sevenDaysAgo) {
                        deletePromises.push(
                            db.ref(`games/${roomId}`).remove()
                                .then(() => {
                                    deletedCount++;
                                    console.log(`🧹 Removed abandoned game: ${roomId}`);
                                })
                                .catch(err => console.error(`🧹 Failed to delete abandoned ${roomId}:`, err.message))
                        );
                    }
                }
            });
            await Promise.all(deletePromises);
        }
        
        if (deletedCount > 0) {
            console.log(`🧹 Cleanup complete: ${deletedCount} games removed`);
        } else {
            console.log('🧹 Cleanup complete: No games needed removal');
        }
        
    } catch (err) {
        console.error('🧹 Cleanup job error:', err.message);
    }
}

/**
 * Stop cleanup job
 */
function stopCleanupJob() {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
        console.log('🧹 Cleanup job stopped');
    }
}

module.exports = {
    initCleanupJob,
    runCleanup,
    stopCleanupJob
};
