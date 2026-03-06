import React, { useReducer, useCallback, useMemo, useEffect, useState, useRef } from 'react';
import { Board as BoardClass } from '../core/Board';
import { MoveGenerator, getFromSquare, getToSquare, hasFlag } from '../core/MoveGenerator';
import { Color, PieceType, MOVE_FLAG_SWITCH_KING, MOVE_FLAG_SWITCH_ANY_PIECE } from '../core/types';
import { PIECE_COLOR } from '../core/constants';
import { getPromotedPiece } from '../core/promotion';
import { getLegalMoves, getGameStatus, GameStatus, isInCheck, findKingSquare } from '../core/GameLogic';
import { isSquareAttacked } from '../core/Attack';
import BoardComponent from './Board';
import GameInfo from './GameInfo';

import CapturedPieces from './CapturedPieces';
import Controls from './Controls';
import { useOnlineGame } from '../hooks/useOnlineGame';

// Props Interface
interface GameProps {
    mode?: 'local' | 'online';
    roomId?: string;
}

// Game state type
interface GameState {
    board: BoardClass;
    selectedSquare: number | null;
    validMoves: number[];
    checkSquare: number | null; // Track king's square if in check
    gameStatus: string;
    moveHistory: string[];
    gameId: number;
    whiteCaptured: PieceType[];
    blackCaptured: PieceType[];
}

// Action types
type GameAction =
    | { type: 'SELECT_SQUARE'; square: number }
    | { type: 'MAKE_MOVE'; from: number; to: number }
    | { type: 'NEW_GAME' }
    | { type: 'DESELECT' }
    | { type: 'RECEIVE_MOVE'; from: number; to: number }
    | { type: 'SET_GAME_STATUS'; status: string }
    | { type: 'SET_BOARD_FROM_FEN'; fen: string; moveHistory?: string[] };

function createInitialState(): GameState {
    const board = new BoardClass();
    board.setupStartPosition();
    return {
        board,
        selectedSquare: null,
        validMoves: [],
        checkSquare: null,
        gameStatus: 'White to move',
        moveHistory: [],
        gameId: Date.now(),
        whiteCaptured: [],
        blackCaptured: []
    };
}

// Reducer
function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
        case 'SET_BOARD_FROM_FEN': {
            const newBoard = new BoardClass();
            newBoard.parseFEN(action.fen);
            // Re-calculate status
            const nextMoveGen = new MoveGenerator(newBoard);
            const gameStatusObj = getGameStatus(newBoard, nextMoveGen);
            const sideText = newBoard.getSide() === Color.WHITE ? 'White' : 'Black';

            let statusMessage = `${sideText} to move`;
            let checkSquare: number | null = null;

            if (gameStatusObj.status === GameStatus.CHECK || gameStatusObj.status === GameStatus.CHECKMATE) {
                // Find king square to highlight
                const kingColor = newBoard.getSide(); // Side to move is in check
                checkSquare = findKingSquare(newBoard, kingColor);
                if (gameStatusObj.status === GameStatus.CHECK) statusMessage = `⚠️ ${sideText} is in CHECK!`;
                else statusMessage = `🏆 CHECKMATE! ${gameStatusObj.winner === Color.WHITE ? 'White' : 'Black'} Wins!`;
            } else if (gameStatusObj.status === GameStatus.STALEMATE) {
                statusMessage = `🤝 STALEMATE! Draw.`;
            }

            return {
                ...state,
                board: newBoard,
                selectedSquare: null,
                validMoves: [],
                checkSquare,
                gameStatus: statusMessage,
                gameId: Date.now(), // Force re-render
                whiteCaptured: [], // Reset captures on FEN load (limitation: lost history)
                blackCaptured: []
            };
        }

        case 'SELECT_SQUARE': {
            const { square } = action;
            const piece = state.board.getPiece(square);

            if (piece === PieceType.EMPTY || PIECE_COLOR[piece] !== state.board.getSide()) {
                if (state.selectedSquare !== null && state.validMoves.includes(square)) {
                    return gameReducer(state, { type: 'MAKE_MOVE', from: state.selectedSquare, to: square });
                }
                return { ...state, selectedSquare: null, validMoves: [] };
            }

            const moveGen = new MoveGenerator(state.board);
            const allMoves = getLegalMoves(state.board, moveGen);
            const validMoves = allMoves
                .filter(move => getFromSquare(move) === square)
                .map(move => getToSquare(move));

            return {
                ...state,
                selectedSquare: square,
                validMoves,
            };
        }

        case 'MAKE_MOVE':
        case 'RECEIVE_MOVE': {
            const { from, to } = action;
            // FIXED: Use clone() to preserve history and other state!
            const newBoard = state.board.clone();

            // Get the piece being moved
            const movedPiece = newBoard.getPiece(from);

            // Defensive Check: If the piece is already gone (likely due to FEN sync happening first), ignore this move.
            if (movedPiece === PieceType.EMPTY) {
                return state;
            }

            // Find the actual move from legal moves to check for special flags
            const moveGen = new MoveGenerator(newBoard);
            const allMoves = getLegalMoves(newBoard, moveGen);
            const actualMove = allMoves.find(m => getFromSquare(m) === from && getToSquare(m) === to);

            // Check for special Tamerlane moves
            if (actualMove && hasFlag(actualMove, MOVE_FLAG_SWITCH_KING)) {
                // King Switch: Swap two kings
                const kingAtFrom = newBoard.getPiece(from);
                const kingAtTo = newBoard.getPiece(to);
                newBoard.clearPiece(from);
                newBoard.clearPiece(to);
                newBoard.setPiece(to, kingAtFrom);
                newBoard.setPiece(from, kingAtTo);
            } else if (actualMove && hasFlag(actualMove, MOVE_FLAG_SWITCH_ANY_PIECE)) {
                // Sole King Teleport: Swap king with any piece
                const kingAtFrom = newBoard.getPiece(from);
                const pieceAtTo = newBoard.getPiece(to);
                newBoard.clearPiece(from);
                newBoard.clearPiece(to);
                newBoard.setPiece(to, kingAtFrom);
                newBoard.setPiece(from, pieceAtTo);
            } else {
                // Normal move or AdKing Citadel Escape (treated as normal move)
                newBoard.movePiece(from, to);
            }

            // Check for pawn promotion
            const ranksBrd = newBoard.getRanksBrd();
            const toRank = ranksBrd[to];
            const isWhitePawn = movedPiece >= PieceType.W_PAWN_PAWN && movedPiece <= PieceType.W_PAWN_ROOK;
            const isBlackPawn = movedPiece >= PieceType.B_PAWN_PAWN && movedPiece <= PieceType.B_PAWN_ROOK;

            if (isWhitePawn && toRank === 10) {
                const promotedPiece = getPromotedPiece(movedPiece);
                newBoard.clearPiece(to);
                newBoard.setPiece(to, promotedPiece);
            } else if (isBlackPawn && toRank === 1) {
                const promotedPiece = getPromotedPiece(movedPiece);
                newBoard.clearPiece(to);
                newBoard.setPiece(to, promotedPiece);
            }

            newBoard.switchSide();

            // Track move history for special pawn rules
            newBoard.addMoveToHistory(from, to);

            // Track Pawn of Pawn promotions
            if (isWhitePawn && toRank === 10 && movedPiece === PieceType.W_PAWN_PAWN) {
                newBoard.incrementWhitePawnOfPawnPromotions();
            } else if (isBlackPawn && toRank === 1 && movedPiece === PieceType.B_PAWN_PAWN) {
                newBoard.incrementBlackPawnOfPawnPromotions();
            }

            const nextMoveGen = new MoveGenerator(newBoard);
            const gameStatusObj = getGameStatus(newBoard, nextMoveGen);
            const sideText = newBoard.getSide() === Color.WHITE ? 'White' : 'Black';

            let statusMessage = `${sideText} to move`;
            let checkSquare: number | null = null;

            if (gameStatusObj.status === GameStatus.CHECK || gameStatusObj.status === GameStatus.CHECKMATE) {
                const kingColor = newBoard.getSide();
                checkSquare = findKingSquare(newBoard, kingColor);

                if (gameStatusObj.status === GameStatus.CHECK) {
                    statusMessage = `⚠️ ${sideText} is in CHECK!`;
                } else {
                    const winner = gameStatusObj.winner === Color.WHITE ? 'White' : 'Black';
                    statusMessage = `🏆 CHECKMATE! ${winner} Wins!`;
                }
            } else if (gameStatusObj.status === GameStatus.STALEMATE) {
                statusMessage = `🤝 STALEMATE! Draw.`;
            }

            // Track Captures
            let newWhiteCaptured = [...state.whiteCaptured];
            let newBlackCaptured = [...state.blackCaptured];

            if (actualMove) {
                // Ensure we use the capture from the verified move
                const captured = (actualMove >> 16) & 0x3f; // Extract captured piecetype
                if (captured !== PieceType.EMPTY) {
                   const side = newBoard.getSide(); // Side has already switched in newBoard.movePiece? 
                   // newBoard.switchSide() is called at line 169.
                   // So newBoard.getSide() is the NEXT player.
                   // The player who MOVED is the opposite.
                   // If newBoard.getSide() is BLACK, then WHITE just moved.
                   
                   const whoMoved = newBoard.getSide() === Color.WHITE ? Color.BLACK : Color.WHITE;
                   
                   if (whoMoved === Color.WHITE) {
                       newWhiteCaptured.push(captured);
                   } else {
                       newBlackCaptured.push(captured);
                   }
                }
            }

            return {
                ...state,
                board: newBoard,
                selectedSquare: null,
                validMoves: [],
                checkSquare,
                gameStatus: statusMessage,
                moveHistory: [...state.moveHistory, `${from}-${to}`],
                gameId: state.gameId,
                whiteCaptured: newWhiteCaptured,
                blackCaptured: newBlackCaptured
            };
        }

        case 'NEW_GAME': {
            return createInitialState();
        }

        case 'DESELECT': {
            return { ...state, selectedSquare: null, validMoves: [] };
        }

        case 'SET_GAME_STATUS': {
            return { ...state, gameStatus: action.status };
        }

        default:
            return state;
    }
}

// Main Game Component
function Game({ mode = 'local', roomId }: GameProps) {
    const [state, dispatch] = useReducer(gameReducer, null, createInitialState);
    const lastUpdateRef = React.useRef(Date.now());

    // Only use online hook if mode is online AND roomId is present
    const online = useOnlineGame(mode === 'online' ? roomId : undefined);

    useEffect(() => {
        if (mode === 'online' && online) {
            online.onMoveReceived((from, to) => {
                dispatch({ type: 'RECEIVE_MOVE', from, to });
            });
        }
    }, [mode, online]);

    // Sync Game Status with Online State
    useEffect(() => {
        if (mode === 'online' && online.state.isOnline) {
            let statusMsg = state.gameStatus; // Default from reducer

            if (!online.state.opponentConnected) {
                statusMsg = "Waiting for opponent...";
            } else {
                const isMyTurn = online.state.playerColor === online.state.currentTurn;
                statusMsg = isMyTurn ? "Your Turn" : "Opponent's Turn";

                // Add warning if spectator
                if (online.state.isSpectator) statusMsg = "Spectating Mode";
            }

            if (online.state.error) statusMsg = "Error: " + online.state.error;
        }
    }, [mode, online?.state, state.gameStatus]);

    // Save Match History on Game End
    useEffect(() => {
        if (mode === 'online' && online.state.gameStatus === 'finished' && online.state.winner) {
            const saveHistory = async () => {
                const firebase = (window as any).firebase;
                const { currentUser } = firebase.auth();
                if (!currentUser) return;

                const isWinner = online.state.winner === online.state.playerColor;
                const matchData = {
                    date: firebase.database.ServerValue.TIMESTAMP,
                    opponent: 'Online Opponent', // ideally fetch opponent name
                    result: isWinner ? 'WIN' : 'LOSS',
                    reason: online.state.endReason || 'Checkmate'
                };

                // Save to my history
                await firebase.database().ref(`users/${currentUser.uid}/matchHistory`).push(matchData);
            };

            // Run only once when it finishes (state change management tricky here, ensuring idempotency)
            // Ideally we check if we already saved this gameId, but for now simple push
            // To prevent double save, we could stash 'saved' state
        }
    }, [mode, online.state.gameStatus]);

    // Consolidated Sync: Board State (FEN) & Game Status (Persistence)
    useEffect(() => {
        if (mode !== 'online' || !online.state.isOnline) return;

        // 1. Restore Board from Server FEN
        // 1. Restore Board from Server FEN
        if (online.state.currentFen) {
            const localFen = state.board.generateFEN();
            // Normalize FENs (trim spaces)
            const serverFen = online.state.currentFen.trim();
            const localFenTrim = localFen.trim();

            const isSignificantlyDifferent = serverFen !== localFenTrim;

            // Only force-set board if FEN actually disagrees.
            // Ignoring history mismatch if the board state is physically correct prevents UI jumps.
            if (isSignificantlyDifferent) {
                dispatch({
                    type: 'SET_BOARD_FROM_FEN',
                    fen: online.state.currentFen,
                    moveHistory: online.state.moveHistory || []
                });
            } else if ((online.state.moveHistory?.length || 0) > state.moveHistory.length) {
                 // Optimization: If board matches but history is missing (e.g. reload or race), 
                 // we can just silent update history or do nothing if visual replay isn't critical.
                 // But for simplicity/correctness of "undo" or logs, we sync.
                 // However, resetting board kills selection.
                 // Let's only do it if the game is idle (no selection).
                 if (state.selectedSquare === null) {
                    dispatch({
                        type: 'SET_BOARD_FROM_FEN',
                        fen: online.state.currentFen,
                        moveHistory: online.state.moveHistory || []
                    });
                 }
            }
        }

        // 2. Force Game Status from Server (Essential for F5 Defeat/Victory)
        if (online.state.gameStatus === 'finished' && online.state.winner) {
            let statusText = '';
            if (online.state.winner === 'draw') statusText = '🤝 Game Ended in Draw';
            else statusText = `🏆 ${online.state.winner === 'white' ? 'White' : 'Black'} Won!`;

            // We only update if local status is not already specific about the end
            // Actually, we should probably force it or use a specific action to lock the game
            // But since dispatching SET_BOARD_FROM_FEN recalculates status, we might overwrite it.
            // So we dispatch SET_GAME_STATUS *after* board sync if needed.
            // dispatch({ type: 'SET_GAME_STATUS', status: statusText });
            // In Tamerlane reducer, SET_BOARD_FROM_FEN might reset status to "Checkmate" if FEN implies it.
            // But if resignation/timeout, FEN doesn't show it.
            // So we MUST override.
            if (online.state.endReason === 'surrender' || (online.state.endReason && online.state.endReason.includes('timeout')) || online.state.endReason === 'disconnected') {
                statusText = `${online.state.winner === 'white' ? 'White' : 'Black'} Won by ${online.state.endReason}`;
                dispatch({ type: 'SET_GAME_STATUS', status: statusText });
            }
        }
    }, [mode, online.state.currentFen, online.state.gameStatus, online.state.winner, online.state.endReason, online.state.connectionStatus]);

    const handleSquareClick = useCallback((square: number) => {
        // Prevent moves if game is over (Freeze Board)
        if (state.gameStatus.includes('CHECKMATE') || state.gameStatus.includes('STALEMATE') || (mode === 'online' && online.state.gameStatus === 'finished')) {
            return;
        }

        // Online Mode Security & Turn Check
        if (mode === 'online' && online.state.isOnline) {

            if (online.state.isSpectator) {
                return;
            }

            const myColor = online.state.playerColor;
            const currentTurn = state.board.getSide() === Color.WHITE ? 'white' : 'black';

            if (myColor !== currentTurn) {
                return;
            }
        }

        if (state.selectedSquare !== null && state.validMoves.includes(square)) {
            // Make move locally
            dispatch({ type: 'MAKE_MOVE', from: state.selectedSquare, to: square });

            // Send to online
            if (mode === 'online' && online.state.isOnline) {
                // Calculate new FEN for persistence
                const tempBoard = new BoardClass();
                tempBoard.parseFEN(state.board.generateFEN());
                const piece = tempBoard.getPiece(state.selectedSquare);

                // Determine promotion
                const ranksBrd = tempBoard.getRanksBrd();
                const toRank = ranksBrd[square];
                const isWhitePawn = piece >= PieceType.W_PAWN_PAWN && piece <= PieceType.W_PAWN_ROOK;
                const isBlackPawn = piece >= PieceType.B_PAWN_PAWN && piece <= PieceType.B_PAWN_ROOK;

                tempBoard.movePiece(state.selectedSquare, square);

                if ((isWhitePawn && toRank === 10) || (isBlackPawn && toRank === 1)) {
                    const promoted = getPromotedPiece(piece);
                    tempBoard.clearPiece(square);
                    tempBoard.setPiece(square, promoted);
                }
                tempBoard.switchSide();
                const newFen = tempBoard.generateFEN();

                // Calculate status for payload
                const nextMoveGen = new MoveGenerator(tempBoard);
                const statusObj = getGameStatus(tempBoard, nextMoveGen);

                const payload = {
                    currentFen: newFen,
                    moveHistory: [...state.moveHistory, `${state.selectedSquare}-${square}`],
                    isGameOver: statusObj.status === GameStatus.CHECKMATE || statusObj.status === GameStatus.STALEMATE,
                    winner: statusObj.winner === Color.WHITE ? 'white' : (statusObj.winner === Color.BLACK ? 'black' : 'draw'),
                    reason: statusObj.status === GameStatus.CHECKMATE ? 'Checkmate' : (statusObj.status === GameStatus.STALEMATE ? 'Stalemate' : null)
                };

                online.sendMove(state.selectedSquare, square, payload);
            }
        } else {
            dispatch({ type: 'SELECT_SQUARE', square });
        }
    }, [state.selectedSquare, state.validMoves, state.board, mode, online]);

    const handleNewGame = useCallback(() => {
        if (mode === 'local') {
            dispatch({ type: 'NEW_GAME' });
        }
    }, [mode]);

    // Derived State for Board
    const boardData = useMemo(() => ({
        pieces: state.board.getPieces(),
        filesBrd: state.board.getFilesBrd(),
        ranksBrd: state.board.getRanksBrd(),
    }), [state.board, state.gameId]);

    // Flip board if playing as Black online
    const shouldFlip = mode === 'online' && online.state.playerColor === 'black';

    // Status Message Override for Online
    let displayStatus = state.gameStatus;
    if (mode === 'online' && online.state.isOnline) {
        if (online.state.gameStatus === 'finished') displayStatus = "🏁 Game Over";
        else if (online.state.isSpectator) displayStatus = "👁️ Spectating";
        else if (!online.state.opponentConnected) displayStatus = "⏳ Waiting for opponent...";
        else {
            const isMyTurn = online.state.playerColor === online.state.currentTurn;
            const oppName = online.state.opponentNickname || "Opponent";
            displayStatus = isMyTurn ? `🎮 Your Turn (${online.state.playerColor})` : `✋ ${oppName}'s Turn`;
        }
    }

    // Timer Logic
    const [timers, setTimers] = useState<{ white: string, black: string }>({ white: '--:--', black: '--:--' });

    useEffect(() => {
        if (mode !== 'online' || !online.state.timeControl || online.state.gameStatus === 'finished') {
            return;
        }

        const interval = setInterval(() => {
            // Use Server Time for calculating elapsed time to avoid clock skew
            const now = Date.now() + (online.state.serverTimeOffset || 0);
            const { whiteTime, blackTime, timeControl, currentTurn, lastMove } = online.state;

            const fmt = (s: number) => {
                const m = Math.floor(s / 60);
                const sec = Math.floor(s % 60);
                return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
            };

            // White Calculation
            let wRem = whiteTime ?? timeControl ?? 0;
            // Only deduct if clock has started (lastMove exists) AND it's their turn
            if (currentTurn === 'white' && lastMove) {
                const elapsed = (now - lastMove.timestamp) / 1000;
                wRem = Math.max(0, wRem - elapsed);
            }

            // Black Calculation
            let bRem = blackTime ?? timeControl ?? 0;
            if (currentTurn === 'black' && lastMove) {
                const elapsed = (now - lastMove.timestamp) / 1000;
                bRem = Math.max(0, bRem - elapsed);
            }

            setTimers({ white: fmt(wRem), black: fmt(bRem) });

            // Timeout Checks (Only claim if it's MY turn and I ran out)
            // Actually, usually SERVER claims timeout. But here P2P.
            // If I run out of time, I should admit defeat.
            if (online.state.playerColor === 'white' && wRem <= 0 && currentTurn === 'white' && lastMove) {
                online.loseOnTime();
            }
            if (online.state.playerColor === 'black' && bRem <= 0 && currentTurn === 'black' && lastMove) {
                online.loseOnTime();
            }

        }, 1000);

        return () => clearInterval(interval);
    }, [mode, online.state]);

    // Calculate Captured Pieces
    const { whiteCaptured, blackCaptured } = useMemo(() => {
        const currentPieces = state.board.getPieces();
        const startBoard = new BoardClass();
        startBoard.setupStartPosition();
        const startPieces = startBoard.getPieces();

        const whiteCap: PieceType[] = []; // Black pieces captured by White
        const blackCap: PieceType[] = []; // White pieces captured by Black

        // Simple difference counting (naive approach for piece sets)
        // Since Tamerlane Chess has specific counts of pieces, we can count types.
        const countTypes = (pieces: PieceType[]) => {
            const counts = new Map<PieceType, number>();
            pieces.forEach(p => {
                if (p !== PieceType.EMPTY) counts.set(p, (counts.get(p) || 0) + 1);
            });
            return counts;
        };

        const startCounts = countTypes(startPieces);
        const currentCounts = countTypes(currentPieces);

        // Determine missing pieces
        startCounts.forEach((count, type) => {
            const current = currentCounts.get(type) || 0;
            const diff = count - current;
            if (diff > 0) {
                const color = PIECE_COLOR[type];
                for (let i = 0; i < diff; i++) {
                    if (color === Color.BLACK) whiteCap.push(type); // Black piece missing -> White captured it
                    else blackCap.push(type); // White piece missing -> Black captured it
                }
            }
        });

        return { whiteCaptured: whiteCap, blackCaptured: blackCap };
    }, [state.board, state.gameId]);

    // Calculate which king is in check for highlighting
    const checkSquare = useMemo(() => {
        if (state.gameStatus.includes('CHECK') || state.gameStatus.includes('CHECKMATE')) {
            const side = state.board.getSide();
            const opponent = side === Color.WHITE ? Color.BLACK : Color.WHITE;

            const kingTypes = side === Color.WHITE
                ? [PieceType.W_KING, PieceType.W_PRINCE, PieceType.W_ADKING]
                : [PieceType.B_KING, PieceType.B_PRINCE, PieceType.B_ADKING];

            // Check each king type to see if it's actually under attack
            for (const kType of kingTypes) {
                const squares = state.board.getPieceSquares(kType);
                for (const sq of squares) {
                    // We need to check if THIS specific king is under attack
                    // Importing isSquareAttacked from GameLogic (if exported) or Attack (if exported)
                    // Currently isSquareAttacked is in Attack.ts and exported
                    if (isSquareAttacked(state.board, sq, opponent)) {
                        return sq;
                    }
                }
            }
        }

        return null; // Return null (not undefined) if no check
    }, [state.gameStatus, state.board]);

    return (
        <>
            <div className="game-container-responsive" style={{
            position: 'relative',
            marginTop: online.state.isSpectator ? '20px' : '0'
        }}>
            {online.state.isSpectator && (
                <div style={{
                    position: 'absolute',
                    top: '-18px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#3b82f6',
                    color: 'white',
                    padding: '0.2rem 1rem',
                    borderRadius: '12px',
                    fontWeight: 'bold',
                    fontSize: '0.7rem',
                    zIndex: 10,
                    whiteSpace: 'nowrap'
                }}>
                    👁️ SPECTATING
                </div>
            )}
            <div className="game-area">
                <BoardComponent
                    key={state.gameId} // Force re-render on new game
                    pieces={state.board.getPieces()}
                    filesBrd={state.board.getFilesBrd()}
                    ranksBrd={state.board.getRanksBrd()}
                    selectedSquare={state.selectedSquare}
                    validMoves={state.validMoves}
                    checkSquare={state.checkSquare}
                    onSquareClick={handleSquareClick}
                    isFlipped={mode === 'online' && online.state.playerColor === 'black'}
                    isReadOnly={mode === 'online' && ((online.state.isSpectator && !online.state.playerColor) || (online.state.isOnline && !online.state.opponentConnected))}
                />
            </div>

            <aside className="sidebar" style={{ minWidth: '300px' }}>
                <GameInfo
                    status={displayStatus}
                    currentSide={state.board.getSide()}
                    moveCount={mode === 'online' && online.state.moveHistory ? online.state.moveHistory.length : state.moveHistory.length}
                    whiteTime={online.state.timeControl ? timers.white : undefined}
                    blackTime={online.state.timeControl ? timers.black : undefined}
                    whiteName={
                        mode === 'online' && online.state.isOnline
                            ? (online.state.playerColor === 'white' ? 'You' : (online.state.opponentNickname || 'Opponent'))
                            : 'Player 1'
                    }
                    blackName={
                        mode === 'online' && online.state.isOnline
                            ? (online.state.playerColor === 'black' ? 'You' : (online.state.opponentNickname || 'Opponent'))
                            : 'Player 2'
                    }
                    opponentName={
                        mode === 'online' && online.state.isOnline
                            ? (online.state.opponentNickname || 'Opponent')
                            : 'Opponent'
                    }
                    // connectionStatus removed as requested
                    isWhiteMe={mode === 'online' ? online.state.playerColor === 'white' : undefined}
                    isBlackMe={mode === 'online' ? online.state.playerColor === 'black' : undefined}
                />

                <CapturedPieces whiteCaptured={whiteCaptured} blackCaptured={blackCaptured} />

                {mode === 'local' && (
                    <div className="controls">
                        <button className="btn btn-primary" onClick={handleNewGame}>New Game</button>
                    </div>
                )}

                {mode === 'online' && (
                    <div className="online-controls" style={{ marginTop: '1rem' }}>
                        {/* Game Over Banner */}
                        {online.state.gameStatus === 'finished' ? (
                            <div style={{
                                padding: '1rem',
                                background: online.state.isSpectator 
                                    ? 'rgba(59, 130, 246, 0.15)'
                                    : (online.state.winner === online.state.playerColor ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)'),
                                borderRadius: '8px',
                                border: `1px solid ${online.state.isSpectator 
                                    ? '#3b82f6'
                                    : (online.state.winner === online.state.playerColor ? '#22c55e' : '#ef4444')}`,
                                textAlign: 'center'
                            }}>
                                <h3 style={{
                                    color: online.state.isSpectator 
                                        ? '#60a5fa'
                                        : (online.state.winner === online.state.playerColor ? '#4ade80' : '#f87171'),
                                    marginBottom: '0.25rem',
                                    fontSize: '1.5rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px'
                                }}>
                                    {online.state.isSpectator
                                        ? (online.state.winner === 'white' ? 'WHITE WINS' : (online.state.winner === 'black' ? 'BLACK WINS' : 'DRAW'))
                                        : (online.state.winner === online.state.playerColor ? 'VICTORY' : 'DEFEAT')}
                                </h3>
                                <p style={{ color: '#ccc', fontSize: '0.9rem', margin: 0 }}>
                                    {online.state.endReason ? `Reason: ${online.state.endReason}` : (online.state.winner === 'draw' ? 'Draw' : `${online.state.winner} won`)}
                                </p>
                                <button
                                    onClick={() => window.location.href = '/lobby'}
                                    style={{
                                        marginTop: '1rem',
                                        padding: '0.5rem 1rem',
                                        background: 'transparent',
                                        border: '1px solid #666',
                                        color: '#eee',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    Back to Lobby
                                </button>
                            </div>
                        ) : (
                            /* Active Game Controls */
                            !online.state.isSpectator && (
                                <button
                                    onClick={() => online.surrender()}
                                    disabled={!online.state.opponentConnected}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        background: online.state.opponentConnected ? '#7f1d1d' : '#333',
                                        color: online.state.opponentConnected ? '#fee2e2' : '#666',
                                        border: online.state.opponentConnected ? '1px solid #991b1b' : '1px solid #444',
                                        borderRadius: '6px',
                                        cursor: online.state.opponentConnected ? 'pointer' : 'not-allowed',
                                        fontWeight: 'bold',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        opacity: online.state.opponentConnected ? 1 : 0.5
                                    }}
                                >
                                    🏳️ Surrender
                                </button>
                            )
                        )}
                    </div>
                )}
            </aside>
        </div>
    </>
    );
}

export default Game;
