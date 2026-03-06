// Classic Chess Move Validation
import { ClassicPieceType, ClassicColor, CLASSIC_PIECE_COLOR } from './ClassicTypes';

export class ClassicMoveValidator {

    // Get all valid moves for a piece at a given square
    static getValidMoves(
        pieces: ClassicPieceType[],
        square: number,
        enPassantSquare: number | null = null,
        castlingRights: { whiteKingside: boolean; whiteQueenside: boolean; blackKingside: boolean; blackQueenside: boolean } | null = null
    ): number[] {
        const piece = pieces[square];
        if (piece === ClassicPieceType.EMPTY) return [];

        const color = CLASSIC_PIECE_COLOR[piece]!;

        switch (piece) {
            case ClassicPieceType.W_PAWN:
            case ClassicPieceType.B_PAWN:
                return this.getPawnMoves(pieces, square, color, enPassantSquare);
            case ClassicPieceType.W_KNIGHT:
            case ClassicPieceType.B_KNIGHT:
                return this.getKnightMoves(pieces, square, color);
            case ClassicPieceType.W_BISHOP:
            case ClassicPieceType.B_BISHOP:
                return this.getBishopMoves(pieces, square, color);
            case ClassicPieceType.W_ROOK:
            case ClassicPieceType.B_ROOK:
                return this.getRookMoves(pieces, square, color);
            case ClassicPieceType.W_QUEEN:
            case ClassicPieceType.B_QUEEN:
                return this.getQueenMoves(pieces, square, color);
            case ClassicPieceType.W_KING:
            case ClassicPieceType.B_KING:
                return this.getKingMoves(pieces, square, color, castlingRights);
            default:
                return [];
        }
    }

    private static getPawnMoves(pieces: ClassicPieceType[], square: number, color: ClassicColor, enPassantSquare: number | null): number[] {
        const moves: number[] = [];
        const rank = Math.floor(square / 8);
        const file = square % 8;
        const direction = color === 'white' ? -1 : 1;
        const startRank = color === 'white' ? 6 : 1;

        // Forward move
        const forward = square + direction * 8;
        if (forward >= 0 && forward < 64 && pieces[forward] === ClassicPieceType.EMPTY) {
            moves.push(forward);

            // Double move from start
            if (rank === startRank) {
                const doubleForward = square + direction * 16;
                if (pieces[doubleForward] === ClassicPieceType.EMPTY) {
                    moves.push(doubleForward);
                }
            }
        }

        // Captures
        const captureOffsets = [-1, 1];
        for (const offset of captureOffsets) {
            const captureFile = file + offset;
            if (captureFile >= 0 && captureFile < 8) {
                const captureSq = forward + offset;
                if (captureSq >= 0 && captureSq < 64) {
                    const target = pieces[captureSq];
                    if (target !== ClassicPieceType.EMPTY && CLASSIC_PIECE_COLOR[target] !== color) {
                        moves.push(captureSq);
                    }
                    // En passant
                    if (enPassantSquare === captureSq) {
                        moves.push(captureSq);
                    }
                }
            }
        }

        return moves;
    }

    private static getKnightMoves(pieces: ClassicPieceType[], square: number, color: ClassicColor): number[] {
        const moves: number[] = [];
        const rank = Math.floor(square / 8);
        const file = square % 8;

        const knightOffsets = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];

        for (const [dr, df] of knightOffsets) {
            const newRank = rank + dr;
            const newFile = file + df;
            if (newRank >= 0 && newRank < 8 && newFile >= 0 && newFile < 8) {
                const targetSq = newRank * 8 + newFile;
                const target = pieces[targetSq];
                if (target === ClassicPieceType.EMPTY || CLASSIC_PIECE_COLOR[target] !== color) {
                    moves.push(targetSq);
                }
            }
        }

        return moves;
    }

    private static getBishopMoves(pieces: ClassicPieceType[], square: number, color: ClassicColor): number[] {
        return this.getSlidingMoves(pieces, square, color, [[-1, -1], [-1, 1], [1, -1], [1, 1]]);
    }

    private static getRookMoves(pieces: ClassicPieceType[], square: number, color: ClassicColor): number[] {
        return this.getSlidingMoves(pieces, square, color, [[-1, 0], [1, 0], [0, -1], [0, 1]]);
    }

    private static getQueenMoves(pieces: ClassicPieceType[], square: number, color: ClassicColor): number[] {
        return this.getSlidingMoves(pieces, square, color, [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1], [0, 1],
            [1, -1], [1, 0], [1, 1]
        ]);
    }

    private static getKingMoves(
        pieces: ClassicPieceType[],
        square: number,
        color: ClassicColor,
        castlingRights: { whiteKingside: boolean; whiteQueenside: boolean; blackKingside: boolean; blackQueenside: boolean } | null = null
    ): number[] {
        const moves: number[] = [];
        const rank = Math.floor(square / 8);
        const file = square % 8;

        const kingOffsets = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1], [0, 1],
            [1, -1], [1, 0], [1, 1]
        ];

        for (const [dr, df] of kingOffsets) {
            const newRank = rank + dr;
            const newFile = file + df;
            if (newRank >= 0 && newRank < 8 && newFile >= 0 && newFile < 8) {
                const targetSq = newRank * 8 + newFile;
                const target = pieces[targetSq];
                if (target === ClassicPieceType.EMPTY || CLASSIC_PIECE_COLOR[target] !== color) {
                    moves.push(targetSq);
                }
            }
        }

        // Castling Logic
        if (castlingRights) {
            // White (King at e1 -> 60)
            if (color === 'white' && square === 60) {
                // Kingside (g1 -> 62)
                if (castlingRights.whiteKingside &&
                    pieces[61] === ClassicPieceType.EMPTY &&
                    pieces[62] === ClassicPieceType.EMPTY) {
                    moves.push(62);
                }
                // Queenside (c1 -> 58)
                if (castlingRights.whiteQueenside &&
                    pieces[59] === ClassicPieceType.EMPTY &&
                    pieces[58] === ClassicPieceType.EMPTY &&
                    pieces[57] === ClassicPieceType.EMPTY) {
                    moves.push(58);
                }
            }
            // Black (King at e8 -> 4)
            else if (color === 'black' && square === 4) {
                // Kingside (g8 -> 6)
                if (castlingRights.blackKingside &&
                    pieces[5] === ClassicPieceType.EMPTY &&
                    pieces[6] === ClassicPieceType.EMPTY) {
                    moves.push(6);
                }
                // Queenside (c8 -> 2)
                if (castlingRights.blackQueenside &&
                    pieces[3] === ClassicPieceType.EMPTY &&
                    pieces[2] === ClassicPieceType.EMPTY &&
                    pieces[1] === ClassicPieceType.EMPTY) {
                    moves.push(2);
                }
            }
        }

        return moves;
    }

    private static getSlidingMoves(pieces: ClassicPieceType[], square: number, color: ClassicColor, directions: number[][]): number[] {
        const moves: number[] = [];
        const rank = Math.floor(square / 8);
        const file = square % 8;

        for (const [dr, df] of directions) {
            let newRank = rank + dr;
            let newFile = file + df;

            while (newRank >= 0 && newRank < 8 && newFile >= 0 && newFile < 8) {
                const targetSq = newRank * 8 + newFile;
                const target = pieces[targetSq];

                if (target === ClassicPieceType.EMPTY) {
                    moves.push(targetSq);
                } else {
                    if (CLASSIC_PIECE_COLOR[target] !== color) {
                        moves.push(targetSq);
                    }
                    break;
                }

                newRank += dr;
                newFile += df;
            }
        }

        return moves;
    }

    // Check if king is in check
    static isKingInCheck(pieces: ClassicPieceType[], color: ClassicColor): boolean {
        // Find king position
        const kingPiece = color === 'white' ? ClassicPieceType.W_KING : ClassicPieceType.B_KING;
        let kingSquare = -1;
        for (let i = 0; i < 64; i++) {
            if (pieces[i] === kingPiece) {
                kingSquare = i;
                break;
            }
        }

        if (kingSquare === -1) return false;

        // Check if any opponent piece can attack the king
        const opponentColor = color === 'white' ? 'black' : 'white';
        for (let i = 0; i < 64; i++) {
            const piece = pieces[i];
            if (piece !== ClassicPieceType.EMPTY && CLASSIC_PIECE_COLOR[piece] === opponentColor) {
                const moves = this.getValidMoves(pieces, i);
                if (moves.includes(kingSquare)) {
                    return true;
                }
            }
        }

        return false;
    }

    // Find king square for highlighting
    static findKingSquare(pieces: ClassicPieceType[], color: ClassicColor): number | null {
        const kingPiece = color === 'white' ? ClassicPieceType.W_KING : ClassicPieceType.B_KING;
        for (let i = 0; i < 64; i++) {
            if (pieces[i] === kingPiece) {
                return i;
            }
        }
        return null;
    }

    // Check if it's checkmate
    static isCheckmate(pieces: ClassicPieceType[], color: ClassicColor): boolean {
        if (!this.isKingInCheck(pieces, color)) return false;

        // Try all possible moves to see if any escape check
        for (let from = 0; from < 64; from++) {
            const piece = pieces[from];
            if (piece !== ClassicPieceType.EMPTY && CLASSIC_PIECE_COLOR[piece] === color) {
                const moves = this.getValidMoves(pieces, from);
                for (const to of moves) {
                    // Simulate move
                    const newPieces = [...pieces];
                    newPieces[to] = newPieces[from];
                    newPieces[from] = ClassicPieceType.EMPTY;

                    // If king is no longer in check, not checkmate
                    if (!this.isKingInCheck(newPieces, color)) {
                        return false;
                    }
                }
            }
        }

        return true; // No moves escape check = checkmate
    }
}
