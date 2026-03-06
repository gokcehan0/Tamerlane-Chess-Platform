/**
 * Classic Chess - Server Side Game Logic
 * Validates standard chess moves for anti-cheat
 */

// Piece types (lowercase = black, uppercase = white)
const PIECES = {
    EMPTY: '.',
    WHITE_KING: 'K', WHITE_QUEEN: 'Q', WHITE_ROOK: 'R', 
    WHITE_BISHOP: 'B', WHITE_KNIGHT: 'N', WHITE_PAWN: 'P',
    BLACK_KING: 'k', BLACK_QUEEN: 'q', BLACK_ROOK: 'r',
    BLACK_BISHOP: 'b', BLACK_KNIGHT: 'n', BLACK_PAWN: 'p'
};

function isWhite(piece) {
    return piece >= 'A' && piece <= 'Z';
}

function isBlack(piece) {
    return piece >= 'a' && piece <= 'z';
}

function isEmpty(piece) {
    return piece === '.' || piece === ' ' || !piece;
}

function getColor(piece) {
    if (isWhite(piece)) return 'white';
    if (isBlack(piece)) return 'black';
    return null;
}

// Parse algebraic notation (e.g., "e4") to {file, rank}
function parseSquare(sq) {
    if (!sq || sq.length < 2) return null;
    const file = sq.charCodeAt(0) - 'a'.charCodeAt(0); // 0-7
    const rank = parseInt(sq[1]) - 1; // 0-7
    if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
    return { file, rank };
}

// Parse FEN string to 8x8 board array
function parseFEN(fen) {
    const board = [];
    const rows = fen.split(' ')[0].split('/');
    
    for (let r = 7; r >= 0; r--) {
        const row = rows[7 - r] || '';
        let file = 0;
        const boardRow = [];
        
        for (const char of row) {
            if (char >= '1' && char <= '8') {
                const empty = parseInt(char);
                for (let i = 0; i < empty; i++) {
                    boardRow.push('.');
                    file++;
                }
            } else {
                boardRow.push(char);
                file++;
            }
        }
        
        // Pad row to 8 squares
        while (boardRow.length < 8) boardRow.push('.');
        board[r] = boardRow;
    }
    
    return board;
}

function getPiece(board, file, rank) {
    if (rank < 0 || rank > 7 || file < 0 || file > 7) return null;
    return board[rank]?.[file] || '.';
}

function isPathClear(board, fromFile, fromRank, toFile, toRank) {
    const df = Math.sign(toFile - fromFile);
    const dr = Math.sign(toRank - fromRank);
    
    let f = fromFile + df;
    let r = fromRank + dr;
    
    while (f !== toFile || r !== toRank) {
        if (!isEmpty(getPiece(board, f, r))) return false;
        f += df;
        r += dr;
    }
    
    return true;
}

/**
 * Convert numeric square index (0-63) to {file, rank}.
 * Board layout: index 0 = a8 (top-left), index 63 = h1 (bottom-right).
 * Row 0 = rank 8 (indices 0-7), Row 7 = rank 1 (indices 56-63).
 */
function indexToSquare(idx) {
    const file = idx % 8;         // 0-7  (a-h)
    const row = Math.floor(idx / 8); // 0-7  (visual row top to bottom)
    const rank = 7 - row;         // convert to rank: row 0 = rank 7, row 7 = rank 0
    return { file, rank };
}

function isValidMove(fen, from, to, playerColor) {
    try {
        const board = parseFEN(fen);

        // Support both numeric indices (from client) and algebraic notation
        let fromSq, toSq;
        if (typeof from === 'number') {
            fromSq = indexToSquare(from);
        } else {
            fromSq = parseSquare(from);
        }
        if (typeof to === 'number') {
            toSq = indexToSquare(to);
        } else {
            toSq = parseSquare(to);
        }
        
        if (!fromSq || !toSq) return false;
        
        const piece = getPiece(board, fromSq.file, fromSq.rank);
        const target = getPiece(board, toSq.file, toSq.rank);
        
        // Check piece ownership
        const pieceColor = getColor(piece);
        if (pieceColor !== playerColor) return false;
        
        // Can't capture own piece
        if (!isEmpty(target) && getColor(target) === playerColor) return false;
        
        // CRITICAL: Cannot capture the king - this is illegal
        const targetUpper = target.toUpperCase();
        if (targetUpper === 'K') {
            console.warn(`🚨 KING CAPTURE ATTEMPT BLOCKED: ${playerColor} tried to capture king at ${to}`);
            return false;
        }
        
        const df = toSq.file - fromSq.file;
        const dr = toSq.rank - fromSq.rank;
        const absDF = Math.abs(df);
        const absDR = Math.abs(dr);
        
        const pieceUpper = piece.toUpperCase();
        
        switch (pieceUpper) {
            case 'P': // Pawn
                const direction = playerColor === 'white' ? 1 : -1;
                const startRank = playerColor === 'white' ? 1 : 6;
                
                // Forward move
                if (df === 0 && isEmpty(target)) {
                    if (dr === direction) return true;
                    // Double move from start
                    if (dr === 2 * direction && fromSq.rank === startRank) {
                        return isPathClear(board, fromSq.file, fromSq.rank, toSq.file, toSq.rank);
                    }
                }
                // Diagonal capture
                if (absDF === 1 && dr === direction && !isEmpty(target)) {
                    return true;
                }
                // TODO: En passant
                return false;
                
            case 'R': // Rook
                if (df !== 0 && dr !== 0) return false;
                return isPathClear(board, fromSq.file, fromSq.rank, toSq.file, toSq.rank);
                
            case 'N': // Knight
                return (absDF === 2 && absDR === 1) || (absDF === 1 && absDR === 2);
                
            case 'B': // Bishop
                if (absDF !== absDR) return false;
                return isPathClear(board, fromSq.file, fromSq.rank, toSq.file, toSq.rank);
                
            case 'Q': // Queen
                if (df !== 0 && dr !== 0 && absDF !== absDR) return false;
                return isPathClear(board, fromSq.file, fromSq.rank, toSq.file, toSq.rank);
                
            case 'K': // King
                // Normal move
                if (absDF <= 1 && absDR <= 1) return true;
                // Castling (simplified - just check distance)
                if (absDR === 0 && absDF === 2) {
                    // TODO: Full castling validation (check rook, path, king not moved)
                    return true; // Allow for now
                }
                return false;
                
            default:
                return false;
        }
        
    } catch (e) {
        console.error("Classic validation error:", e);
        return false;
    }
}

module.exports = {
    isValidMove,
    parseFEN,
    parseSquare
};
