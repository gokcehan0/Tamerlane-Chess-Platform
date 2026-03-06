/**
 * Bridge module: Allows the CJS worker to access shared TypeScript game logic.
 * Worker imports THIS file (TS→TS imports are clean, no interop issues).
 */

import { Board } from '../src/core/Board';
import { MoveGenerator } from '../src/core/MoveGenerator';
import { getGameStatus, GameStatus } from '../src/core/GameLogic';
import { Color } from '../src/core/types';

/**
 * Server-side game end verification.
 * Creates a Board from FEN, generates all legal moves, checks for checkmate/stalemate.
 * @returns { isGameOver, winner, reason } or { isGameOver: false }
 */
/**
 * Server-side Tamerlane FEN computation after a move.
 * Applies the move to the board and generates the resulting FEN.
 * This replaces trusting the client-provided FEN.
 *
 * @param currentFen - Current FEN before the move
 * @param fromSq - Source square (algebraic, e.g. 'a1')
 * @param toSq - Target square (algebraic, e.g. 'a3')
 * @returns New FEN string after the move
 */
export function computeFenAfterMove(currentFen: string, fromSq: string, toSq: string): string {
    const board = new Board();
    board.parseFEN(currentFen);

    // Convert algebraic notation to internal square indices
    const from = algebraicToInternal(fromSq);
    const to = algebraicToInternal(toSq);

    if (from === -1 || to === -1) {
        // Invalid squares — return original FEN as fallback
        return currentFen;
    }

    board.movePiece(from, to);
    board.switchSide();
    return board.generateFEN();
}

/**
 * Convert Tamerlane algebraic notation (a1-k10 or citadelW/citadelB) to internal square index.
 */
function algebraicToInternal(sq: string): number {
    if (!sq) return -1;
    const lower = sq.toLowerCase();

    if (lower === 'citadelw') return 88;  // CITADEL_WHITE
    if (lower === 'citadelb') return 181; // CITADEL_BLACK

    const file = lower.charCodeAt(0) - 'a'.charCodeAt(0) + 1; // 1-11
    const rank = parseInt(lower.substring(1)); // 1-10
    if (file < 1 || file > 11 || rank < 1 || rank > 10) return -1;

    return 46 + file + rank * 15; // fileRankToSquare formula
}

export function verifyGameEnd(fen: string, lastMoveBy: string): { isGameOver: boolean; winner?: string; reason?: string } {
    const board = new Board();
    board.parseFEN(fen);
    const generator = new MoveGenerator(board);
    const result = getGameStatus(board, generator);

    if (result.status === GameStatus.CHECKMATE) {
        return { isGameOver: true, winner: lastMoveBy, reason: 'checkmate' };
    } else if (result.status === GameStatus.STALEMATE) {
        return { isGameOver: true, winner: 'draw', reason: 'stalemate' };
    }

    return { isGameOver: false };
}
