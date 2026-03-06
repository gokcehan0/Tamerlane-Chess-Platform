// Simple Classic Chess Board (8x8)
import { ClassicPieceType, ClassicColor, CLASSIC_PIECE_COLOR } from './ClassicTypes';
import { ClassicMoveValidator } from './ClassicMoveValidator';

export class ClassicBoard {
    pieces: ClassicPieceType[];
    currentTurn: ClassicColor;
    enPassantSquare: number | null;
    castlingRights: { whiteKingside: boolean; whiteQueenside: boolean; blackKingside: boolean; blackQueenside: boolean };
    isGameOver: boolean;
    winner: ClassicColor | 'draw' | null;

    constructor() {
        this.pieces = new Array(64).fill(ClassicPieceType.EMPTY);
        this.currentTurn = 'white';
        this.enPassantSquare = null;
        this.castlingRights = {
            whiteKingside: true,
            whiteQueenside: true,
            blackKingside: true,
            blackQueenside: true
        };
        this.isGameOver = false;
        this.winner = null;
        this.setupInitialPosition();
    }

    setupInitialPosition() {
        // Black pieces (rank 8 and 7)
        this.pieces[0] = ClassicPieceType.B_ROOK;
        this.pieces[1] = ClassicPieceType.B_KNIGHT;
        this.pieces[2] = ClassicPieceType.B_BISHOP;
        this.pieces[3] = ClassicPieceType.B_QUEEN;
        this.pieces[4] = ClassicPieceType.B_KING;
        this.pieces[5] = ClassicPieceType.B_BISHOP;
        this.pieces[6] = ClassicPieceType.B_KNIGHT;
        this.pieces[7] = ClassicPieceType.B_ROOK;

        for (let i = 8; i < 16; i++) {
            this.pieces[i] = ClassicPieceType.B_PAWN;
        }

        // White pieces (rank 1 and 2)
        for (let i = 48; i < 56; i++) {
            this.pieces[i] = ClassicPieceType.W_PAWN;
        }

        this.pieces[56] = ClassicPieceType.W_ROOK;
        this.pieces[57] = ClassicPieceType.W_KNIGHT;
        this.pieces[58] = ClassicPieceType.W_BISHOP;
        this.pieces[59] = ClassicPieceType.W_QUEEN;
        this.pieces[60] = ClassicPieceType.W_KING;
        this.pieces[61] = ClassicPieceType.W_BISHOP;
        this.pieces[62] = ClassicPieceType.W_KNIGHT;
        this.pieces[63] = ClassicPieceType.W_ROOK;
    }

    getPiece(square: number): ClassicPieceType {
        if (square < 0 || square >= 64) return ClassicPieceType.EMPTY;
        return this.pieces[square];
    }

    setPiece(square: number, piece: ClassicPieceType) {
        if (square >= 0 && square < 64) {
            this.pieces[square] = piece;
        }
    }

    getValidMoves(square: number): number[] {
        const moves = ClassicMoveValidator.getValidMoves(this.pieces, square, this.enPassantSquare, this.castlingRights);
        const piece = this.pieces[square];

        // Filter moves that leave king in check
        return moves.filter(to => {
            // Special Castling Validation: Cannot castle if in check, or through check
            if ((piece === ClassicPieceType.W_KING || piece === ClassicPieceType.B_KING) && Math.abs(to - square) === 2) {
                // 1. Cannot castle if currently in check
                if (ClassicMoveValidator.isKingInCheck(this.pieces, this.currentTurn)) return false;

                // 2. Cannot castle THROUGH check (check middle square)
                const middleSquare = (square + to) / 2;
                const midPieces = [...this.pieces];
                midPieces[middleSquare] = piece; // King moves to middle
                midPieces[square] = ClassicPieceType.EMPTY;
                if (ClassicMoveValidator.isKingInCheck(midPieces, this.currentTurn)) return false;
            }

            // Simulate move (Standard validation)
            const newPieces = [...this.pieces];

            // Handle En Passant capture simulation
            if ((piece === ClassicPieceType.W_PAWN || piece === ClassicPieceType.B_PAWN) &&
                to === this.enPassantSquare && this.enPassantSquare !== null) {
                const capturedPawnSquare = to + (this.currentTurn === 'white' ? 8 : -8);
                newPieces[capturedPawnSquare] = ClassicPieceType.EMPTY;
            }

            newPieces[to] = newPieces[square];
            newPieces[square] = ClassicPieceType.EMPTY;

            return !ClassicMoveValidator.isKingInCheck(newPieces, this.currentTurn);
        });
    }

    makeMove(from: number, to: number): boolean {
        if (this.isGameOver) return false;

        const piece = this.getPiece(from);
        if (piece === ClassicPieceType.EMPTY) return false;

        const pieceColor = CLASSIC_PIECE_COLOR[piece];
        if (pieceColor !== this.currentTurn) return false;

        // Validate move
        const validMoves = this.getValidMoves(from);
        if (!validMoves.includes(to)) return false;

        // Track captured piece
        const capturedPiece = this.getPiece(to);

        // Handle en passant capture
        const isPawn = piece === ClassicPieceType.W_PAWN || piece === ClassicPieceType.B_PAWN;
        if (isPawn && to === this.enPassantSquare && this.enPassantSquare !== null) {
            const capturedPawnSquare = to + (this.currentTurn === 'white' ? 8 : -8);
            this.setPiece(capturedPawnSquare, ClassicPieceType.EMPTY);
        }

        // Make the move
        this.setPiece(to, piece);
        this.setPiece(from, ClassicPieceType.EMPTY);

        // Update en passant square
        if (isPawn && Math.abs(to - from) === 16) {
            this.enPassantSquare = (from + to) / 2;
        } else {
            this.enPassantSquare = null;
        }

        // Handle Castling Execution (Move Rook)
        if ((piece === ClassicPieceType.W_KING || piece === ClassicPieceType.B_KING) && Math.abs(to - from) === 2) {
            // White Kingside
            if (to === 62) {
                this.setPiece(63, ClassicPieceType.EMPTY);
                this.setPiece(61, ClassicPieceType.W_ROOK);
            }
            // White Queenside
            else if (to === 58) {
                this.setPiece(56, ClassicPieceType.EMPTY);
                this.setPiece(59, ClassicPieceType.W_ROOK);
            }
            // Black Kingside
            else if (to === 6) {
                this.setPiece(7, ClassicPieceType.EMPTY);
                this.setPiece(5, ClassicPieceType.B_ROOK);
            }
            // Black Queenside
            else if (to === 2) {
                this.setPiece(0, ClassicPieceType.EMPTY);
                this.setPiece(3, ClassicPieceType.B_ROOK);
            }
        }

        // Pawn promotion (auto-promote to Queen for simplicity)
        if (isPawn) {
            const rank = Math.floor(to / 8);
            if (rank === 0 && this.currentTurn === 'white') {
                this.setPiece(to, ClassicPieceType.W_QUEEN);
            } else if (rank === 7 && this.currentTurn === 'black') {
                this.setPiece(to, ClassicPieceType.B_QUEEN);
            }
        }

        // Update castling rights
        if (piece === ClassicPieceType.W_KING) {
            this.castlingRights.whiteKingside = false;
            this.castlingRights.whiteQueenside = false;
        } else if (piece === ClassicPieceType.B_KING) {
            this.castlingRights.blackKingside = false;
            this.castlingRights.blackQueenside = false;
        } else if (piece === ClassicPieceType.W_ROOK) {
            if (from === 56) this.castlingRights.whiteQueenside = false;
            if (from === 63) this.castlingRights.whiteKingside = false;
        } else if (piece === ClassicPieceType.B_ROOK) {
            if (from === 0) this.castlingRights.blackQueenside = false;
            if (from === 7) this.castlingRights.blackKingside = false;
        }

        // Switch turn
        this.currentTurn = this.currentTurn === 'white' ? 'black' : 'white';

        // Check for checkmate
        if (ClassicMoveValidator.isCheckmate(this.pieces, this.currentTurn)) {
            this.isGameOver = true;
            this.winner = this.currentTurn === 'white' ? 'black' : 'white';
        }

        return true;
    }

    clone(): ClassicBoard {
        const newBoard = new ClassicBoard();
        newBoard.pieces = [...this.pieces];
        newBoard.currentTurn = this.currentTurn;
        newBoard.enPassantSquare = this.enPassantSquare;
        newBoard.castlingRights = { ...this.castlingRights };
        newBoard.isGameOver = this.isGameOver;
        newBoard.winner = this.winner;
        return newBoard;
    }
}
