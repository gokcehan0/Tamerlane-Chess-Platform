// Classic Chess Types (8x8 Standard Chess)

export enum ClassicPieceType {
    EMPTY = 0,
    W_PAWN = 1,
    W_KNIGHT = 2,
    W_BISHOP = 3,
    W_ROOK = 4,
    W_QUEEN = 5,
    W_KING = 6,
    B_PAWN = 7,
    B_KNIGHT = 8,
    B_BISHOP = 9,
    B_ROOK = 10,
    B_QUEEN = 11,
    B_KING = 12,
}

export type ClassicColor = 'white' | 'black';

export const CLASSIC_PIECE_COLOR: Record<ClassicPieceType, ClassicColor | null> = {
    [ClassicPieceType.EMPTY]: null,
    [ClassicPieceType.W_PAWN]: 'white',
    [ClassicPieceType.W_KNIGHT]: 'white',
    [ClassicPieceType.W_BISHOP]: 'white',
    [ClassicPieceType.W_ROOK]: 'white',
    [ClassicPieceType.W_QUEEN]: 'white',
    [ClassicPieceType.W_KING]: 'white',
    [ClassicPieceType.B_PAWN]: 'black',
    [ClassicPieceType.B_KNIGHT]: 'black',
    [ClassicPieceType.B_BISHOP]: 'black',
    [ClassicPieceType.B_ROOK]: 'black',
    [ClassicPieceType.B_QUEEN]: 'black',
    [ClassicPieceType.B_KING]: 'black',
};

// Starting position for 8x8 chess
export const CLASSIC_START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Piece images mapping
export const CLASSIC_PIECE_IMAGES: Record<ClassicPieceType, string> = {
    [ClassicPieceType.EMPTY]: '',
    [ClassicPieceType.W_PAWN]: '/assets/pawn_w.png',
    [ClassicPieceType.W_KNIGHT]: '/assets/knight_w.png',
    [ClassicPieceType.W_BISHOP]: '/assets/bishop_w.png',
    [ClassicPieceType.W_ROOK]: '/assets/rook_w.png',
    [ClassicPieceType.W_QUEEN]: '/assets/queen_w.png',
    [ClassicPieceType.W_KING]: '/assets/king_w.png',
    [ClassicPieceType.B_PAWN]: '/assets/pawn_b.png',
    [ClassicPieceType.B_KNIGHT]: '/assets/knight_b.png',
    [ClassicPieceType.B_BISHOP]: '/assets/bishop_b.png',
    [ClassicPieceType.B_ROOK]: '/assets/rook_b.png',
    [ClassicPieceType.B_QUEEN]: '/assets/queen_b.png',
    [ClassicPieceType.B_KING]: '/assets/king_b.png',
};
