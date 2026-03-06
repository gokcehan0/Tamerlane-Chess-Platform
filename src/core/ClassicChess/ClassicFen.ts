/**
 * ClassicFen - FEN string generation for Classic Chess
 * Converts ClassicBoard state to standard FEN notation for server-side validation.
 *
 * Board layout: pieces[0..63] where index 0 = a8 (top-left), index 63 = h1 (bottom-right)
 * Row 0 = rank 8 (indices 0-7), Row 7 = rank 1 (indices 56-63)
 */

import { ClassicBoard } from './ClassicBoard';
import { ClassicPieceType } from './ClassicTypes';

/** Map piece enum to FEN character */
const PIECE_TO_FEN: Record<ClassicPieceType, string> = {
    [ClassicPieceType.EMPTY]: '',
    [ClassicPieceType.W_PAWN]: 'P',
    [ClassicPieceType.W_KNIGHT]: 'N',
    [ClassicPieceType.W_BISHOP]: 'B',
    [ClassicPieceType.W_ROOK]: 'R',
    [ClassicPieceType.W_QUEEN]: 'Q',
    [ClassicPieceType.W_KING]: 'K',
    [ClassicPieceType.B_PAWN]: 'p',
    [ClassicPieceType.B_KNIGHT]: 'n',
    [ClassicPieceType.B_BISHOP]: 'b',
    [ClassicPieceType.B_ROOK]: 'r',
    [ClassicPieceType.B_QUEEN]: 'q',
    [ClassicPieceType.B_KING]: 'k',
};

/**
 * Convert a ClassicBoard to a FEN string.
 * Format: "piece_placement active_color castling en_passant halfmove fullmove"
 */
export function classicBoardToFen(board: ClassicBoard): string {
    // 1. Piece placement (from rank 8 to rank 1, i.e. indices 0-7 first)
    const ranks: string[] = [];
    for (let rank = 0; rank < 8; rank++) {
        let fenRank = '';
        let emptyCount = 0;

        for (let file = 0; file < 8; file++) {
            const idx = rank * 8 + file;
            const piece = board.pieces[idx];

            if (piece === ClassicPieceType.EMPTY) {
                emptyCount++;
            } else {
                if (emptyCount > 0) {
                    fenRank += emptyCount.toString();
                    emptyCount = 0;
                }
                fenRank += PIECE_TO_FEN[piece];
            }
        }

        if (emptyCount > 0) {
            fenRank += emptyCount.toString();
        }
        ranks.push(fenRank);
    }

    const placement = ranks.join('/');

    // 2. Active color
    const activeColor = board.currentTurn === 'white' ? 'w' : 'b';

    // 3. Castling availability
    let castling = '';
    if (board.castlingRights.whiteKingside) castling += 'K';
    if (board.castlingRights.whiteQueenside) castling += 'Q';
    if (board.castlingRights.blackKingside) castling += 'k';
    if (board.castlingRights.blackQueenside) castling += 'q';
    if (!castling) castling = '-';

    // 4. En passant target square
    let ep = '-';
    if (board.enPassantSquare !== null) {
        const epFile = board.enPassantSquare % 8;
        const epRank = Math.floor(board.enPassantSquare / 8);
        // Convert: rank 0 = rank 8, rank 7 = rank 1
        ep = String.fromCharCode('a'.charCodeAt(0) + epFile) + (8 - epRank).toString();
    }

    // 5+6. Halfmove and fullmove counters (not tracked, use defaults)
    return `${placement} ${activeColor} ${castling} ${ep} 0 1`;
}
