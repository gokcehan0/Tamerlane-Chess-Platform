/**
 * Bridge module: Allows the CJS worker to verify Classic Chess game-end conditions.
 * Uses the shared TypeScript ClassicMoveValidator from client source.
 *
 * This is the Classic Chess counterpart of gameVerifier.ts (Tamerlane).
 */

import {
  ClassicPieceType,
  ClassicColor,
  CLASSIC_PIECE_COLOR,
} from "../src/core/ClassicChess/ClassicTypes";
import { ClassicMoveValidator } from "../src/core/ClassicChess/ClassicMoveValidator";

/** FEN character → ClassicPieceType mapping */
const FEN_TO_PIECE: Record<string, ClassicPieceType> = {
  P: ClassicPieceType.W_PAWN,
  N: ClassicPieceType.W_KNIGHT,
  B: ClassicPieceType.W_BISHOP,
  R: ClassicPieceType.W_ROOK,
  Q: ClassicPieceType.W_QUEEN,
  K: ClassicPieceType.W_KING,
  p: ClassicPieceType.B_PAWN,
  n: ClassicPieceType.B_KNIGHT,
  b: ClassicPieceType.B_BISHOP,
  r: ClassicPieceType.B_ROOK,
  q: ClassicPieceType.B_QUEEN,
  k: ClassicPieceType.B_KING,
};

/** ClassicPieceType → FEN character mapping */
const PIECE_TO_FEN: Record<number, string> = {
  [ClassicPieceType.W_PAWN]: "P",
  [ClassicPieceType.W_KNIGHT]: "N",
  [ClassicPieceType.W_BISHOP]: "B",
  [ClassicPieceType.W_ROOK]: "R",
  [ClassicPieceType.W_QUEEN]: "Q",
  [ClassicPieceType.W_KING]: "K",
  [ClassicPieceType.B_PAWN]: "p",
  [ClassicPieceType.B_KNIGHT]: "n",
  [ClassicPieceType.B_BISHOP]: "b",
  [ClassicPieceType.B_ROOK]: "r",
  [ClassicPieceType.B_QUEEN]: "q",
  [ClassicPieceType.B_KING]: "k",
};

/**
 * Parse a standard FEN string into a 64-element pieces array.
 * Board layout: index 0 = a8 (top-left), index 63 = h1 (bottom-right).
 * Row 0 = rank 8 (indices 0-7), row 7 = rank 1 (indices 56-63).
 */
function parseFenToPieces(fen: string): ClassicPieceType[] {
  const pieces = new Array<ClassicPieceType>(64).fill(ClassicPieceType.EMPTY);
  const boardPart = fen.split(" ")[0];
  const ranks = boardPart.split("/");

  let idx = 0;
  for (const rank of ranks) {
    for (const ch of rank) {
      if (ch >= "1" && ch <= "8") {
        idx += parseInt(ch);
      } else if (FEN_TO_PIECE[ch] !== undefined) {
        pieces[idx] = FEN_TO_PIECE[ch];
        idx++;
      }
    }
  }

  return pieces;
}

/**
 * Generate FEN board-placement string from a 64-element pieces array.
 */
function piecesToFenBoard(pieces: ClassicPieceType[]): string {
  const ranks: string[] = [];
  for (let rank = 0; rank < 8; rank++) {
    let fenRank = "";
    let emptyCount = 0;
    for (let file = 0; file < 8; file++) {
      const piece = pieces[rank * 8 + file];
      if (piece === ClassicPieceType.EMPTY) {
        emptyCount++;
      } else {
        if (emptyCount > 0) {
          fenRank += emptyCount;
          emptyCount = 0;
        }
        fenRank += PIECE_TO_FEN[piece] || "?";
      }
    }
    if (emptyCount > 0) fenRank += emptyCount;
    ranks.push(fenRank);
  }
  return ranks.join("/");
}

/**
 * Check if the side to move has ANY legal move.
 * A legal move is one that does not leave the king in check.
 */
function hasLegalMove(
  pieces: ClassicPieceType[],
  color: ClassicColor,
): boolean {
  for (let from = 0; from < 64; from++) {
    const piece = pieces[from];
    if (
      piece !== ClassicPieceType.EMPTY &&
      CLASSIC_PIECE_COLOR[piece] === color
    ) {
      const moves = ClassicMoveValidator.getValidMoves(pieces, from);
      for (const to of moves) {
        // Simulate move
        const newPieces = [...pieces];
        newPieces[to] = newPieces[from];
        newPieces[from] = ClassicPieceType.EMPTY;

        // If king is NOT in check after this move → it IS a legal move
        if (!ClassicMoveValidator.isKingInCheck(newPieces, color)) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Server-side Classic Chess game end verification.
 * Creates pieces from FEN, checks for checkmate/stalemate.
 *
 * @param fen - Standard FEN string of position AFTER the last move
 * @param lastMoveBy - 'white' or 'black' (the player who just moved)
 * @returns { isGameOver, winner, reason } or { isGameOver: false }
 */
export function verifyClassicGameEnd(
  fen: string,
  lastMoveBy: string,
): { isGameOver: boolean; winner?: string; reason?: string } {
  const pieces = parseFenToPieces(fen);

  // The side to check is the OPPONENT of the last mover (they are the one to move now)
  const sideToMove: ClassicColor = lastMoveBy === "white" ? "black" : "white";

  const inCheck = ClassicMoveValidator.isKingInCheck(pieces, sideToMove);
  const hasMove = hasLegalMove(pieces, sideToMove);

  if (!hasMove) {
    if (inCheck) {
      // Checkmate — last mover wins
      return { isGameOver: true, winner: lastMoveBy, reason: "checkmate" };
    } else {
      // Stalemate — draw
      return { isGameOver: true, winner: "draw", reason: "stalemate" };
    }
  }

  return { isGameOver: false };
}

/**
 * Server-side Classic Chess FEN computation after a move.
 * Applies the move to the FEN and returns the new FEN.
 *
 * @param currentFen - Current FEN before the move
 * @param from - Source square index (0-63) or algebraic (e.g. 'e2')
 * @param to - Target square index (0-63) or algebraic
 * @param moverColor - 'white' or 'black'
 * @returns New FEN string after the move
 */
export function computeClassicFenAfterMove(
  currentFen: string,
  from: number | string,
  to: number | string,
  moverColor: string,
): string {
  const pieces = parseFenToPieces(currentFen);

  // Convert algebraic to index if needed
  let fromIdx: number;
  let toIdx: number;

  if (typeof from === "number") {
    fromIdx = from;
  } else {
    fromIdx = algebraicToIndex(from);
  }

  if (typeof to === "number") {
    toIdx = to;
  } else {
    toIdx = algebraicToIndex(to);
  }

  if (fromIdx < 0 || fromIdx >= 64 || toIdx < 0 || toIdx >= 64) {
    // Invalid squares — return original FEN as fallback
    return currentFen;
  }

  // Apply move
  pieces[toIdx] = pieces[fromIdx];
  pieces[fromIdx] = ClassicPieceType.EMPTY;

  // Handle pawn promotion (auto-promote to queen)
  if (pieces[toIdx] === ClassicPieceType.W_PAWN && toIdx < 8) {
    pieces[toIdx] = ClassicPieceType.W_QUEEN;
  } else if (pieces[toIdx] === ClassicPieceType.B_PAWN && toIdx >= 56) {
    pieces[toIdx] = ClassicPieceType.B_QUEEN;
  }

  // Generate new FEN
  const boardPart = piecesToFenBoard(pieces);
  const nextSide = moverColor === "white" ? "b" : "w";

  // Preserve castling/en-passant from original FEN parts if available, else default
  const fenParts = currentFen.split(" ");
  const castling = fenParts[2] || "-";
  const ep = "-"; // Simplified — reset en passant
  const halfmove = fenParts[4] || "0";
  const fullmove = fenParts[5] || "1";

  return `${boardPart} ${nextSide} ${castling} ${ep} ${halfmove} ${fullmove}`;
}

/**
 * Convert algebraic notation (e.g. 'e4') to board index (0-63).
 * a8=0, h8=7, a1=56, h1=63
 */
function algebraicToIndex(sq: string): number {
  if (!sq || sq.length < 2) return -1;
  const file = sq.charCodeAt(0) - "a".charCodeAt(0); // 0-7
  const rank = parseInt(sq[1]); // 1-8
  if (file < 0 || file > 7 || rank < 1 || rank > 8) return -1;
  // rank 8 = row 0, rank 1 = row 7
  const row = 8 - rank;
  return row * 8 + file;
}
