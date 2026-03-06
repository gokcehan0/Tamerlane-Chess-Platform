import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useOnlineGame } from '../hooks/useOnlineGame';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { FaShareAlt } from 'react-icons/fa';
import ClassicBoard from '../components/ClassicBoard';
import CapturedPieces from '../components/CapturedPieces';
import { ClassicBoard as ClassicBoardLogic } from '../core/ClassicChess/ClassicBoard';
import { ClassicPieceType, CLASSIC_PIECE_COLOR, CLASSIC_PIECE_IMAGES } from '../core/ClassicChess/ClassicTypes';
import { ClassicMoveValidator } from '../core/ClassicChess/ClassicMoveValidator';
import { classicBoardToFen } from '../core/ClassicChess/ClassicFen';

export default function ClassicGame() {
    const { roomId } = useParams<{ roomId: string }>();
    const { currentUser } = useAuth()!;
    const { colors } = useTheme();
    const { showToast } = useToast();
    const navigate = useNavigate();
    
    // Early check for finished games
    const [initialCheckDone, setInitialCheckDone] = useState(false);
    const [gameFinished, setGameFinished] = useState(false);
    const [gameExists, setGameExists] = useState(true);
    
    useEffect(() => {
        if (!roomId || initialCheckDone) return;
        
        const firebase = (window as any).firebase;
        const gameRef = firebase.database().ref(`games/${roomId}`);
        
        gameRef.once('value').then((snap: any) => {
            const game = snap.val();
            if (!game) {
                setGameExists(false);
            } else if (game.gameStatus === 'finished') {
                setGameFinished(true);
            }
            setInitialCheckDone(true);
        }).catch(() => {
            setInitialCheckDone(true);
        });
    }, [roomId, initialCheckDone]);
    
    const online = useOnlineGame(roomId);

    // Initial timer state
    const [timers, setTimers] = useState<{ white: string, black: string }>({ white: '--:--', black: '--:--' });
    const hasClaimedTimeout = useRef(false);

    // Timer Logic - Server Synced
    useEffect(() => {
        if (!online.state.timeControl || online.state.gameStatus === 'finished') {
            return;
        }

        const interval = setInterval(() => {
            const now = Date.now() + (online.state.serverTimeOffset || 0);
            const { whiteTime, blackTime, timeControl, currentTurn, lastMove } = online.state;

            const fmt = (s: number) => {
                const totalSec = Math.max(0, s);
                const m = Math.floor(totalSec / 60);
                const sec = Math.floor(totalSec % 60);
                return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
            };

            // White Calculation
            let wRem = whiteTime ?? timeControl ?? 0;
            if (currentTurn === 'white' && lastMove) {
                const elapsed = (now - lastMove.timestamp) / 1000;
                wRem = wRem - elapsed;
            }

            // Black Calculation
            let bRem = blackTime ?? timeControl ?? 0;
            if (currentTurn === 'black' && lastMove) {
                const elapsed = (now - lastMove.timestamp) / 1000;
                bRem = bRem - elapsed;
            }

            setTimers({ white: fmt(wRem), black: fmt(bRem) });
            
            // Auto-claim timeout if it's MY turn and MY time ran out (only once)
            if (!hasClaimedTimeout.current) {
                if (online.state.playerColor === 'white' && wRem <= 0 && currentTurn === 'white') {
                    hasClaimedTimeout.current = true;
                    online.loseOnTime();
                }
                if (online.state.playerColor === 'black' && bRem <= 0 && currentTurn === 'black') {
                    hasClaimedTimeout.current = true;
                    online.loseOnTime();
                }
            }

        }, 1000);

        return () => clearInterval(interval);
    }, [online.state.timeControl, online.state.gameStatus, online.state.serverTimeOffset, online.state.whiteTime, online.state.blackTime, online.state.currentTurn, online.state.lastMove]);

    const [board, setBoard] = useState<ClassicBoardLogic>(new ClassicBoardLogic());
    const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
    const [validMoves, setValidMoves] = useState<number[]>([]);
    const [whiteCaptured, setWhiteCaptured] = useState<ClassicPieceType[]>([]);
    const [blackCaptured, setBlackCaptured] = useState<ClassicPieceType[]>([]);

    // Calculate check square for highlighting
    const checkSquare = useMemo(() => {
        const currentColor = board.currentTurn;
        if (ClassicMoveValidator.isKingInCheck(board.pieces, currentColor)) {
            return ClassicMoveValidator.findKingSquare(board.pieces, currentColor);
        }
        return null;
    }, [board.pieces, board.currentTurn]);

    // Sync moves, board state, and game status from Firebase
    useEffect(() => {
        let shouldUpdate = false;
        let newBoard = board.clone();

        // 1. Restore from Last Move (if available) - Base Truth
        if (online.state.lastMove) {
            // Restore from board state embedded in last move
            // @ts-ignore - boardState is optional extension
            if (online.state.lastMove.boardState) {
                // @ts-ignore
                const { pieces, currentTurn, castlingRights, enPassantSquare, isGameOver, winner } = online.state.lastMove.boardState;
                newBoard.pieces = pieces;
                newBoard.currentTurn = currentTurn;
                newBoard.castlingRights = castlingRights;
                newBoard.enPassantSquare = enPassantSquare;
                if (isGameOver !== undefined) newBoard.isGameOver = isGameOver;
                if (winner !== undefined) newBoard.winner = winner;
            } else {
                // Fallback: just make the move
                newBoard.makeMove(online.state.lastMove.from, online.state.lastMove.to);
            }
            shouldUpdate = true;
        }

        // 2. Override with Global Game Status (Critical for F5/Restore)
        // If the game is finished globally, enforce it on the board
        if (online.state.gameStatus === 'finished' && online.state.winner) {
            newBoard.isGameOver = true;
            newBoard.winner = online.state.winner as 'white' | 'black' | 'draw';
            shouldUpdate = true;
        }

        if (shouldUpdate) {
            setBoard(newBoard);
            setSelectedSquare(null);
            setValidMoves([]);
        }
    }, [online.state.lastMove, online.state.gameStatus, online.state.winner]);

    // Calculate captured pieces from board state
    useEffect(() => {
        const startingPieces = new ClassicBoardLogic().pieces;
        const whiteCap: ClassicPieceType[] = [];
        const blackCap: ClassicPieceType[] = [];

        // Count pieces in starting position
        const startCount: Record<ClassicPieceType, number> = {} as any;
        startingPieces.forEach(p => {
            if (p !== ClassicPieceType.EMPTY) {
                startCount[p] = (startCount[p] || 0) + 1;
            }
        });

        // Count pieces in current position
        const currentCount: Record<ClassicPieceType, number> = {} as any;
        board.pieces.forEach(p => {
            if (p !== ClassicPieceType.EMPTY) {
                currentCount[p] = (currentCount[p] || 0) + 1;
            }
        });

        // Find captured pieces
        Object.keys(startCount).forEach(pieceStr => {
            const piece = parseInt(pieceStr) as ClassicPieceType;
            const missing = startCount[piece] - (currentCount[piece] || 0);
            const color = CLASSIC_PIECE_COLOR[piece];

            for (let i = 0; i < missing; i++) {
                if (color === 'white') {
                    whiteCap.push(piece);
                } else if (color === 'black') {
                    blackCap.push(piece);
                }
            }
        });

        setWhiteCaptured(whiteCap);
        setBlackCaptured(blackCap);
    }, [board.pieces]);

    const handleSquareClick = (square: number) => {
        const piece = board.getPiece(square);
        const pieceColor = CLASSIC_PIECE_COLOR[piece];

        // If clicking on own piece, select it
        if (pieceColor === online.state.playerColor && pieceColor === board.currentTurn) {
            setSelectedSquare(square);
            const moves = board.getValidMoves(square);
            setValidMoves(moves);
        }
        // If clicking on valid move square, make the move
        else if (selectedSquare !== null && validMoves.includes(square)) {
            const newBoard = board.clone();
            const previousFen = typeof classicBoardToFen === 'function' ? classicBoardToFen(board) : null;
            if (newBoard.makeMove(selectedSquare, square)) {
                setBoard(newBoard);
                const currentFen = typeof classicBoardToFen === 'function' ? classicBoardToFen(newBoard) : null;

                // Send move to Firebase with sanitized data + FEN for server validation
                const boardData = JSON.parse(JSON.stringify({
                    pieces: newBoard.pieces,
                    currentTurn: newBoard.currentTurn,
                    castlingRights: newBoard.castlingRights,
                    enPassantSquare: newBoard.enPassantSquare,
                    isGameOver: newBoard.isGameOver,
                    winner: newBoard.winner,
                    previousFen: previousFen,
                    currentFen: currentFen
                }));
                online.sendMove(selectedSquare, square, boardData);

                setSelectedSquare(null);
                setValidMoves([]);
            }
        }
        // Otherwise, deselect
        else {
            setSelectedSquare(null);
            setValidMoves([]);
        }
    };

    // Early loading state
    if (!initialCheckDone) {
        return (
            <div style={{
                minHeight: '100vh',
                background: colors.bg,
                color: colors.text,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'Inter', sans-serif"
            }}>
                <span>Loading game...</span>
            </div>
        );
    }

    // Game not found
    if (!gameExists) {
        return (
            <div style={{
                minHeight: '100vh',
                background: colors.bg,
                color: colors.text,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'Inter', sans-serif",
                gap: '1rem'
            }}>
                <span style={{ fontSize: '1.5rem' }}>🔍</span>
                <h2>Game Not Found</h2>
                <p style={{ color: colors.textSec }}>This game code doesn't exist.</p>
                <Link to="/classic-lobby" style={{
                    padding: '0.75rem 1.5rem',
                    background: colors.accent,
                    color: 'white',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: 'bold'
                }}>
                    Go to Lobby
                </Link>
            </div>
        );
    }

    // Game finished check - Only show full page if loaded as finished (Archive Mode)
    // If game finishes while playing, we stay on board view.
    if (gameFinished) {
        const winner = online.state.winner;
        const reason = online.state.endReason;
        return (
            <div style={{
                minHeight: '100vh',
                background: colors.bg,
                color: colors.text,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'Inter', sans-serif",
                gap: '1rem'
            }}>
                <span style={{ fontSize: '3rem' }}>🏁</span>
                <h2 style={{ margin: 0 }}>Game Finished</h2>
                {winner && (
                    <p style={{ 
                        color: winner === 'white' ? '#f0f0f0' : '#666',
                        fontSize: '1.2rem',
                        fontWeight: 'bold'
                    }}>
                        {winner === 'draw' ? '🤝 Draw' : `🏆 ${winner.charAt(0).toUpperCase() + winner.slice(1)} Won!`}
                    </p>
                )}
                {reason && (
                    <p style={{ color: colors.textSec, fontSize: '0.9rem' }}>
                        Reason: {reason}
                    </p>
                )}
                <p style={{ color: colors.textSec }}>This game has already ended.</p>
                <Link to="/classic-lobby" style={{
                    padding: '0.75rem 1.5rem',
                    background: colors.accent,
                    color: 'white',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: 'bold'
                }}>
                    Start New Game
                </Link>
            </div>
        );
    }

    if (!online.state.isOnline && !online.state.isConnecting) {
        return (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#fff' }}>
                <h2>Connecting to game...</h2>
            </div>
        );
    }

    if (online.state.error) {
        return (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#ef4444' }}>
                <h2>Error: {online.state.error}</h2>
                <button onClick={() => navigate('/classic-lobby')} style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px' }}>
                    Back to Lobby
                </button>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1rem', maxWidth: '600px', margin: '0 auto', position: 'relative' }}>
            {/* Opponent Info (Top) - Only show when connected */}
            {online.state.opponentConnected && (
                <div style={{
                    width: '100%',
                    maxWidth: '560px',
                    padding: '0.75rem',
                    background: '#1e1e1e',
                    borderRadius: '8px',
                    border: '1px solid #333',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem'
                }}>
                    <div style={{ flex: 1 }}>
                        <p style={{ color: '#fff', fontSize: '1rem', fontWeight: 'bold' }}>
                            {online.state.opponentNickname || (online.state.playerColor === 'white' ? 'Black Player' : 'White Player')}
                        </p>
                    </div>
                    <div style={{ flex: 2, display: 'flex', flexWrap: 'wrap', gap: '0.25rem', justifyContent: 'flex-end' }}>
                        {(online.state.playerColor === 'white' ? blackCaptured : whiteCaptured).map((piece, idx) => (
                            <img
                                key={idx}
                                src={CLASSIC_PIECE_IMAGES[piece]}
                                alt="captured"
                                style={{ width: '24px', height: '24px', opacity: 0.7 }}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Game Status (Compact) */}
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                <span style={{ color: '#aaa' }}>
                    Turn: <strong style={{ color: board.currentTurn === 'white' ? '#fff' : '#888' }}>{board.currentTurn}</strong>
                </span>
                {/* Timer Display */}
                {online.state.timeControl && (
                    <div style={{ display: 'flex', gap: '0.75rem', marginLeft: '0.5rem', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '1rem' }}>
                        <span style={{ color: board.currentTurn === 'white' ? '#22c55e' : '#fff' }}>⚪ {timers.white}</span>
                        <span style={{ color: board.currentTurn === 'black' ? '#22c55e' : '#aaa' }}>⚫ {timers.black}</span>
                    </div>
                )}
                {/* Status indicator removed as requested */}
                <button
                    onClick={() => {
                        const link = `${window.location.origin}/game/classic/${roomId}`;
                        navigator.clipboard.writeText(link);
                        showToast('Link copied!', 'success');
                    }}
                    style={{
                        padding: '0.25rem 0.5rem',
                        background: '#22c55e',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 'bold'
                    }}
                >
                    <FaShareAlt style={{ marginRight: '0.25rem' }} /> Share
                </button>
            </div>

            {/* Board */}
            <ClassicBoard
                pieces={board.pieces}
                onSquareClick={handleSquareClick}
                selectedSquare={selectedSquare}
                validMoves={validMoves}
                playerColor={online.state.playerColor}
                checkSquare={checkSquare}
            />

            {/* Game Over Banner */}
            {board.isGameOver && (
                <div style={{
                    padding: '1rem',
                    background: board.winner === online.state.playerColor ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    borderRadius: '8px',
                    border: `1px solid ${board.winner === online.state.playerColor ? '#22c55e' : '#ef4444'}`,
                    textAlign: 'center',
                    width: '100%',
                    maxWidth: '560px',
                    marginBottom: '0.5rem'
                }}>
                    <h3 style={{
                        color: board.winner === online.state.playerColor ? '#4ade80' : '#f87171',
                        marginBottom: '0.25rem',
                        fontSize: '1.5rem',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                    }}>
                        {board.winner === online.state.playerColor ? 'VICTORY' : 'DEFEAT'}
                    </h3>
                    <p style={{ color: '#ccc', fontSize: '0.9rem', margin: 0 }}>
                        {online.state.endReason ? `Reason: ${online.state.endReason}` : (board.winner === 'draw' ? 'Game ended in a draw' : `${board.winner} wins`)}
                    </p>

                </div>
            )}

            {/* Player Captured Pieces */}
            <div style={{
                width: '100%',
                maxWidth: '560px',
                padding: '0.5rem 0.75rem',
                background: '#1e1e1e',
                borderRadius: '8px',
                border: '1px solid #333',
                minHeight: '40px',
                display: 'flex',
                alignItems: 'center'
            }}>
                <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '0.25rem',
                    alignContent: 'center'
                }}>
                    {(online.state.playerColor === 'white' ? whiteCaptured : blackCaptured).length === 0 ? (
                        <span style={{ color: '#666', fontSize: '0.85rem' }}>No captured pieces</span>
                    ) : (
                        (online.state.playerColor === 'white' ? whiteCaptured : blackCaptured).map((piece, idx) => (
                            <img
                                key={idx}
                                src={CLASSIC_PIECE_IMAGES[piece]}
                                alt="captured"
                                style={{ width: '22px', height: '22px', opacity: 0.8 }}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Action Buttons - Separate Row */}
            <div style={{
                width: '100%',
                maxWidth: '560px',
                display: 'flex',
                gap: '0.75rem',
                justifyContent: 'center'
            }}>
                {!board.isGameOver && !online.state.isSpectator && online.state.gameStatus !== 'finished' && (
                    <button
                        onClick={() => online.surrender()}
                        style={{
                            padding: '0.6rem 1.25rem',
                            background: '#ef4444',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '0.9rem'
                        }}
                    >
                        Surrender
                    </button>
                )}
                {(board.isGameOver || online.state.gameStatus === 'finished') && (
                    <button
                        onClick={() => navigate('/classic-lobby')}
                        style={{
                            padding: '0.6rem 1.25rem',
                            background: 'transparent',
                            color: '#aaa',
                            border: '1px solid #444',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.9rem'
                        }}
                    >
                        Leave Game
                    </button>
                )}
            </div>

        </div>
    );
}
