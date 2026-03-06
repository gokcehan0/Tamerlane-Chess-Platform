import React from 'react';
import { ClassicPieceType, CLASSIC_PIECE_IMAGES } from '../core/ClassicChess/ClassicTypes';
import { useTheme } from '../contexts/ThemeContext';

interface ClassicBoardProps {
    pieces: ClassicPieceType[];
    onSquareClick: (square: number) => void;
    selectedSquare: number | null;
    validMoves: number[];
    playerColor: 'white' | 'black' | null;
    checkSquare?: number | null; // Square where king is in check
}

export default function ClassicBoard({ pieces, onSquareClick, selectedSquare, validMoves, playerColor, checkSquare }: ClassicBoardProps) {
    const { boardTheme } = useTheme();
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

    // Render from white's perspective by default, flip if player is black
    const shouldFlip = playerColor === 'black';

    const renderSquare = (square: number) => {
        const file = square % 8;
        const rank = Math.floor(square / 8);
        const isLight = (file + rank) % 2 === 0;
        const piece = pieces[square];
        const isSelected = selectedSquare === square;
        const isValidMove = validMoves.includes(square);
        const isInCheck = checkSquare === square;

        return (
            <div
                key={square}
                onClick={() => onSquareClick(square)}
                style={{
                    width: '100%',
                    height: '100%',
                    background: isInCheck
                        ? 'rgba(220, 38, 38, 0.7)' // Red for check
                        : isValidMove
                            ? 'rgba(16, 185, 129, 0.6)'
                            : isSelected
                                ? 'rgba(0, 217, 255, 0.5)'
                                : isLight
                                    ? boardTheme.lightSquare
                                    : boardTheme.darkSquare,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                    boxSizing: 'border-box',
                    boxShadow: isSelected ? 'inset 0 0 0 3px #00d9ff' : 'none'
                }}
            >
                {piece !== ClassicPieceType.EMPTY && (
                    <img
                        src={CLASSIC_PIECE_IMAGES[piece]}
                        alt="piece"
                        style={{
                            width: '90%',
                            height: '90%',
                            pointerEvents: 'none'
                        }}
                    />
                )}
                {isValidMove && (
                    <div style={{
                        position: 'absolute',
                        width: '30%',
                        height: '30%',
                        background: 'rgba(16, 185, 129, 0.8)',
                        borderRadius: '50%',
                        pointerEvents: 'none'
                    }} />
                )}
            </div>
        );
    };

    const renderBoard = () => {
        const squares = [];
        for (let rank = 0; rank < 8; rank++) {
            for (let file = 0; file < 8; file++) {
                const square = rank * 8 + file;
                squares.push(renderSquare(square));
            }
        }
        return shouldFlip ? squares.reverse() : squares;
    };

    return (
        <div style={{ width: '100%', maxWidth: '90vw', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{
                width: '100%',
                aspectRatio: '1/1',
                display: 'grid',
                gridTemplateColumns: 'repeat(8, 1fr)',
                gridTemplateRows: 'repeat(8, 1fr)',
                border: '2px solid #333',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                background: '#222'
            }}>
                {renderBoard()}
            </div>

            {/* Coordinates */}
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '0 10px' }}>
                {(shouldFlip ? [...files].reverse() : files).map(f => (
                    <span key={f} style={{ flex: 1, textAlign: 'center', color: '#aaa', fontSize: '0.85rem', fontWeight: '500' }}>{f}</span>
                ))}
            </div>
        </div >
    );
}
