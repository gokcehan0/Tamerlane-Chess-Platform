/**
 * Tamerlane Chess - Server Side Game Logic
 * Combined and adapted from client source for Node.js
 */

// =============================================================================
// TYPE DEFINITIONS & CONSTANTS
// =============================================================================

const Color = {
    WHITE: 0,
    BLACK: 1,
    BOTH: 2
};

const PieceType = {
    EMPTY: 0,
    // White Pawns
    W_PAWN_PAWN: 1, W_PAWN_WARENGINE: 2, W_PAWN_CAMEL: 3, W_PAWN_ELEPHANT: 4, W_PAWN_MINISTER: 5,
    W_PAWN_KING: 6, W_PAWN_ADVISOR: 7, W_PAWN_GIRAFFE: 8, W_PAWN_CATAPULT: 9, W_PAWN_KNIGHT: 10, W_PAWN_ROOK: 11,
    // White Pieces
    W_ROOK: 12, W_KNIGHT: 13, W_CATAPULT: 14, W_GIRAFFE: 15, W_MINISTER: 16,
    W_KING: 17, W_ADVISOR: 18, W_ELEPHANT: 19, W_CAMEL: 20, W_WARENGINE: 21,
    W_PRINCE: 43, W_ADKING: 44,
    // Black Pawns
    B_PAWN_PAWN: 22, B_PAWN_WARENGINE: 23, B_PAWN_CAMEL: 24, B_PAWN_ELEPHANT: 25, B_PAWN_MINISTER: 26,
    B_PAWN_KING: 27, B_PAWN_ADVISOR: 28, B_PAWN_GIRAFFE: 29, B_PAWN_CATAPULT: 30, B_PAWN_KNIGHT: 31, B_PAWN_ROOK: 32,
    // Black Pieces
    B_ROOK: 33, B_KNIGHT: 34, B_CATAPULT: 35, B_GIRAFFE: 36, B_MINISTER: 37,
    B_KING: 38, B_ADVISOR: 39, B_ELEPHANT: 40, B_CAMEL: 41, B_WARENGINE: 42,
    B_PRINCE: 45, B_ADKING: 46
};

// Map PieceType to Color
const PIECE_COLOR = {};
Object.keys(PieceType).forEach(key => {
    const val = PieceType[key];
    if (val === 0) PIECE_COLOR[val] = Color.BOTH;
    else if ((val >= 1 && val <= 21) || val === 43 || val === 44) PIECE_COLOR[val] = Color.WHITE;
    else PIECE_COLOR[val] = Color.BLACK;
});

// Board Constants
const BOARD_SQUARES = 270;
const OFF_BOARD = 209;
const CITADEL_WHITE = 88;
const CITADEL_BLACK = 181;

// FEN Mappings
const FEN_CHAR_TO_PIECE = {
    'P': PieceType.W_PAWN_PAWN, 'X': PieceType.W_PAWN_WARENGINE, 'C': PieceType.W_PAWN_CAMEL,
    'B': PieceType.W_PAWN_ELEPHANT, 'Y': PieceType.W_PAWN_MINISTER, 'Q': PieceType.W_PAWN_KING,
    'E': PieceType.W_PAWN_ADVISOR, 'H': PieceType.W_PAWN_GIRAFFE, 'T': PieceType.W_PAWN_CATAPULT,
    'N': PieceType.W_PAWN_KNIGHT, 'R': PieceType.W_PAWN_ROOK,
    'K': PieceType.W_ROOK, 'A': PieceType.W_KNIGHT, 'M': PieceType.W_CATAPULT, 'Z': PieceType.W_GIRAFFE,
    'G': PieceType.W_MINISTER, 'S': PieceType.W_KING, 'V': PieceType.W_ADVISOR, 'F': PieceType.W_ELEPHANT,
    'D': PieceType.W_CAMEL, 'I': PieceType.W_WARENGINE, 'J': PieceType.W_PRINCE, 'L': PieceType.W_ADKING,
    'p': PieceType.B_PAWN_PAWN, 'x': PieceType.B_PAWN_WARENGINE, 'c': PieceType.B_PAWN_CAMEL,
    'b': PieceType.B_PAWN_ELEPHANT, 'y': PieceType.B_PAWN_MINISTER, 'q': PieceType.B_PAWN_KING,
    'e': PieceType.B_PAWN_ADVISOR, 'h': PieceType.B_PAWN_GIRAFFE, 't': PieceType.B_PAWN_CATAPULT,
    'n': PieceType.B_PAWN_KNIGHT, 'r': PieceType.B_PAWN_ROOK,
    'k': PieceType.B_ROOK, 'a': PieceType.B_KNIGHT, 'm': PieceType.B_CATAPULT, 'z': PieceType.B_GIRAFFE,
    'g': PieceType.B_MINISTER, 's': PieceType.B_KING, 'v': PieceType.B_ADVISOR, 'f': PieceType.B_ELEPHANT,
    'd': PieceType.B_CAMEL, 'i': PieceType.B_WARENGINE, 'j': PieceType.B_PRINCE, 'l': PieceType.B_ADKING
};

// =============================================================================
// BOARD LOGIC
// =============================================================================

function fileRankToSquare(file, rank) {
    return 46 + file + rank * 15;
}

// Pre-calculate Board Arrays for 11x10 + Citadels
const filesBrd = new Array(BOARD_SQUARES).fill(OFF_BOARD);
const ranksBrd = new Array(BOARD_SQUARES).fill(OFF_BOARD);

function initBoardArrays() {
    for (let rank = 1; rank <= 10; rank++) {
        for (let file = 1; file <= 11; file++) {
            const sq = fileRankToSquare(file, rank);
            filesBrd[sq] = file;
            ranksBrd[sq] = rank;
        }
    }
    // Citadels
    filesBrd[CITADEL_BLACK] = 0; ranksBrd[CITADEL_BLACK] = 9;
    filesBrd[CITADEL_WHITE] = 12; ranksBrd[CITADEL_WHITE] = 2;
}

initBoardArrays();

function isOffBoard(sq) {
    if (sq < 0 || sq >= BOARD_SQUARES) return true;
    return filesBrd[sq] === OFF_BOARD;
}

function parseFEN(fen) {
    const pieces = new Array(BOARD_SQUARES).fill(PieceType.EMPTY);
    let rank = 10;
    let file = 1;
    let fenIndex = 0;

    // Remove any trailing move/side info for parsing board
    const boardFen = fen.split(' ')[0];

    while (rank >= 1 && fenIndex < boardFen.length) {
        const char = boardFen[fenIndex];

        if (char === '/') {
            rank--;
            file = 1;
        } else if (char >= '1' && char <= '9') {
            let count = parseInt(char);
            if (fenIndex + 1 < boardFen.length && boardFen[fenIndex + 1] >= '0' && boardFen[fenIndex + 1] <= '9') {
                count = count * 10 + parseInt(boardFen[fenIndex + 1]);
                fenIndex++;
            }
            file += count;
        } else if (FEN_CHAR_TO_PIECE[char] !== undefined) {
            const sq = fileRankToSquare(file, rank);
            pieces[sq] = FEN_CHAR_TO_PIECE[char];
            file++;
        }
        fenIndex++;
    }
    return pieces;
}

// =============================================================================
// VALIDATION LOGIC
// =============================================================================

function isPathClear(board, from, to) {
    // Check if path is clear for sliding pieces
    // Note: We use simple steps. Tamerlane uses 15-based internal board.
    // Difference is (to - from).

    // Determine direction step
    let diff = to - from;
    let step = 0;

    // Horizontal
    if (Math.abs(diff) < 15) step = Math.sign(diff);
    // Vertical
    else if (diff % 15 === 0) step = Math.sign(diff) * 15;
    // Diagonal 14
    else if (diff % 14 === 0) step = Math.sign(diff) * 14;
    // Diagonal 16
    else if (diff % 16 === 0) step = Math.sign(diff) * 16;
    else return false; // Invalid sliding direction

    let curr = from + step;
    while (curr !== to) {
        if (isOffBoard(curr)) return false;
        if (board[curr] !== PieceType.EMPTY) return false;
        curr += step;
    }
    return true;
}

function getDelta(from, to) {
    const f1 = filesBrd[from], r1 = ranksBrd[from];
    const f2 = filesBrd[to], r2 = ranksBrd[to];
    // Special case for citadels or off-board
    if (f1 === OFF_BOARD || f1 === OFF_BOARD) return { dr: 99, dc: 99 };

    return {
        dr: Math.abs(r1 - r2),
        dc: Math.abs(f1 - filesBrd[to]) // f1 and f2 logic needed? filesBrd[to]
    };
}

function isValidMove(fen, from, to, playerColorString) {
    try {
        // 0. Parse Board
        const board = parseFEN(fen);
        const playerColor = playerColorString === 'white' ? Color.WHITE : Color.BLACK;

        // 1. Basic Boundary Checks
        if (isOffBoard(from) || isOffBoard(to)) return false;

        // 2. Piece Ownership
        const piece = board[from];
        if (piece === PieceType.EMPTY) return false;
        if (PIECE_COLOR[piece] !== playerColor) return false;

        // 3. Avoid Capturing Own Piece
        const target = board[to];
        if (target !== PieceType.EMPTY && PIECE_COLOR[target] === playerColor) return false;

        // CRITICAL: Cannot capture the king - this is illegal
        if (target === PieceType.W_KING || target === PieceType.B_KING || 
            target === PieceType.W_ADKING || target === PieceType.B_ADKING) {
            console.warn(`🚨 KING CAPTURE ATTEMPT BLOCKED in Tamerlane`);
            return false;
        }

        // 4. Geometry & Movement Rules (Simplified but Robust)
        const fileFrom = filesBrd[from], rankFrom = ranksBrd[from];
        const fileTo = filesBrd[to], rankTo = ranksBrd[to];
        const dr = Math.abs(rankTo - rankFrom);
        const dc = Math.abs(fileTo - fileFrom);

        const isPawn = (piece >= 1 && piece <= 11) || (piece >= 22 && piece <= 32);

        if (isPawn) {
            // Direction check
            const forward = playerColor === Color.WHITE ? 1 : -1;
            const actualDr = rankTo - rankFrom;

            // Forward 1 (Non-capture)
            if (actualDr === forward && dc === 0) {
                return target === PieceType.EMPTY;
            }
            // Diagonal 1 (Capture)
            if (actualDr === forward && dc === 1) {
                return target !== PieceType.EMPTY;
            }
            return false;
        }

        switch (piece) {
            case PieceType.W_ROOK: case PieceType.B_ROOK:
            case PieceType.W_PAWN_ROOK: case PieceType.B_PAWN_ROOK:
                if (dr !== 0 && dc !== 0) return false;
                return isPathClear(board, from, to);

            case PieceType.W_KNIGHT: case PieceType.B_KNIGHT:
            case PieceType.W_PAWN_KNIGHT: case PieceType.B_PAWN_KNIGHT:
                return (dr === 2 && dc === 1) || (dr === 1 && dc === 2);

            case PieceType.W_CATAPULT: case PieceType.B_CATAPULT:
            case PieceType.W_PAWN_CATAPULT: case PieceType.B_PAWN_CATAPULT:
                // Picket/Catapult: Diagonal slider but MUST move at least 2 squares
                if (dr !== dc) return false;
                if (dr < 2) return false; // Minimum 2 squares
                return isPathClear(board, from, to);

            case PieceType.W_ELEPHANT: case PieceType.B_ELEPHANT:
            case PieceType.W_PAWN_ELEPHANT: case PieceType.B_PAWN_ELEPHANT:
                // Tamerlane Elephant: 2 squares diagonally (Jumper)
                return (dr === 2 && dc === 2);

            case PieceType.W_CAMEL: case PieceType.B_CAMEL:
            case PieceType.W_PAWN_CAMEL: case PieceType.B_PAWN_CAMEL:
                // Camel: 3x1 Jumper
                return (dr === 3 && dc === 1) || (dr === 1 && dc === 3);

            case PieceType.W_WARENGINE: case PieceType.B_WARENGINE:
            case PieceType.W_PAWN_WARENGINE: case PieceType.B_PAWN_WARENGINE:
                // Dabbaba: 2 squares orthogonal (Jumper)
                return (dr === 2 && dc === 0) || (dr === 0 && dc === 2);

            case PieceType.W_MINISTER: case PieceType.B_MINISTER:
            case PieceType.W_PAWN_MINISTER: case PieceType.B_PAWN_MINISTER:
                // Ferz: 1 square diagonal
                return (dr === 1 && dc === 1);

            case PieceType.W_ADVISOR: case PieceType.B_ADVISOR:
            case PieceType.W_PAWN_ADVISOR: case PieceType.B_PAWN_ADVISOR:
                // Wazir: 1 square orthogonal
                return ((dr === 1 && dc === 0) || (dr === 0 && dc === 1));

            case PieceType.W_GIRAFFE: case PieceType.B_GIRAFFE:
            case PieceType.W_PAWN_GIRAFFE: case PieceType.B_PAWN_GIRAFFE:
                // Giraffe: 1 diagonal then >2 straight. 
                // Simplified anti-cheat: Ensure moved far enough and conceptually correct
                // This is hard to validate perfectly without path checks, but let's ensure distance.
                // Min distance 4 squares? (1 diag + 3 straight)
                if (Math.abs(fileTo - fileFrom) < 2 && Math.abs(rankTo - rankFrom) < 2) return false;
                return true; // Lenient for Giraffe complexity

            case PieceType.W_KING: case PieceType.B_KING:
            case PieceType.W_ADKING: case PieceType.B_ADKING:
            case PieceType.W_PRINCE: case PieceType.B_PRINCE:
            case PieceType.W_PAWN_KING: case PieceType.B_PAWN_KING:
                // 1 square any direction
                return (dr <= 1 && dc <= 1);

            default:
                return true; // Fallback
        }

    } catch (e) {
        console.error("Validation Error:", e);
        return false;
    }
}

module.exports = {
    isValidMove,
    parseFEN,
    fileRankToSquare,
    PieceType,
    Color
};
