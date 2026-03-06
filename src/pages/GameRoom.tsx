import React, { useState, useEffect } from 'react';
import { useParams, Navigate, Link, useNavigate } from 'react-router-dom';
import Game from '../components/Game';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { FaShareAlt } from 'react-icons/fa';

export default function GameRoom() {
    const { roomId } = useParams<{ roomId: string }>();
    const { colors } = useTheme();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [gameFinished, setGameFinished] = useState(false);
    const [gameExists, setGameExists] = useState(true);

    useEffect(() => {
        if (!roomId) return;

        const firebase = (window as any).firebase;
        const gameRef = firebase.database().ref(`games/${roomId}`);

        gameRef.once('value').then((snap: any) => {
            const game = snap.val();
            if (!game) {
                setGameExists(false);
            } else if (game.gameStatus === 'finished') {
                setGameFinished(true);
            }
            setLoading(false);
        }).catch(() => {
            setLoading(false);
        });
    }, [roomId]);

    if (!roomId) {
        return <Navigate to="/lobby" />;
    }

    if (loading) {
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
                <Link to="/lobby" style={{
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

    if (gameFinished) {
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
                <span style={{ fontSize: '2rem' }}>🏁</span>
                <h2>Game Finished</h2>
                <p style={{ color: colors.textSec }}>This game has already ended.</p>
                <Link to="/lobby" style={{
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

    return (
        <div style={{
            minHeight: '100vh',
            background: colors.bg,
            color: colors.text,
            fontFamily: "'Inter', sans-serif",
            display: 'flex',
            flexDirection: 'column'
        }}>
            <div style={{ padding: '0.5rem 1rem', background: colors.sidebar, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${colors.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link to="/lobby" style={{ textDecoration: 'none', color: colors.textSec }}>← Lobby</Link>
                    <span style={{ color: colors.text }}>Room: <strong>{roomId}</strong></span>
                    <button
                        onClick={() => {
                            const link = `${window.location.origin}/game/${roomId}`;
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
                            fontSize: '0.8rem',
                            fontWeight: 'bold'
                        }}
                    >
                        <FaShareAlt style={{ marginRight: '0.25rem' }} /> Share
                    </button>
                </div>
            </div>

            <div className="online-game-wrapper">
                <Game mode="online" roomId={roomId} />
            </div>
        </div>
    );
}

