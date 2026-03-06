import React, { memo, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface ControlsProps {
    onNewGame: () => void;
    onCreateRoom: () => Promise<string>;
    onJoinRoom: (code: string) => void;
    roomCode: string | null;
    isOnline: boolean;
    playerColor: 'white' | 'black' | null;
}

/**
 * Controls component - game control buttons with online multiplayer
 */
const Controls: React.FC<ControlsProps> = memo(({
    onNewGame,
    onCreateRoom,
    onJoinRoom,
    roomCode,
    isOnline,
    playerColor
}) => {
    const { colors } = useTheme();
    const [joinCode, setJoinCode] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const handleCreateRoom = async () => {
        setIsCreating(true);
        try {
            await onCreateRoom();
        } finally {
            setIsCreating(false);
        }
    };

    const handleJoinRoom = () => {
        if (joinCode.trim().length >= 4) {
            onJoinRoom(joinCode.trim().toUpperCase());
        }
    };

    return (
        <div className="controls" style={{ background: colors.card, color: colors.text, borderRadius: '8px', padding: '1rem', border: `1px solid ${colors.border}` }}>
            <h3 style={{ borderBottom: `1px solid ${colors.border}`, paddingBottom: '0.5rem', marginTop: 0 }}>🎮 Controls</h3>

            <button className="btn btn-primary" onClick={onNewGame} style={{ width: '100%', marginBottom: '1rem' }}>
                🔄 New Game
            </button>

            {/* Online Multiplayer Section */}
            <div className="online-section" style={{ background: colors.bg, padding: '1rem', borderRadius: '6px', border: `1px solid ${colors.border}`, marginBottom: '1rem' }}>
                <h4 style={{ marginTop: 0, color: colors.text }}>🌐 Online Multiplayer</h4>

                {!isOnline ? (
                    <>
                        <button
                            className="btn btn-success"
                            onClick={handleCreateRoom}
                            disabled={isCreating}
                            style={{ width: '100%', marginBottom: '0.5rem' }}
                        >
                            {isCreating ? '⏳ Creating...' : '🏠 Create Room'}
                        </button>

                        <div className="join-room" style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                type="text"
                                placeholder="Enter room code"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                maxLength={6}
                                className="room-input"
                                style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: `1px solid ${colors.border}`, background: colors.card, color: colors.text }}
                            />
                            <button
                                className="btn btn-join"
                                onClick={handleJoinRoom}
                                disabled={joinCode.length < 4}
                                style={{ background: colors.accent, color: '#fff', border: 'none', borderRadius: '4px', padding: '0 1rem', cursor: 'pointer' }}
                            >
                                🚪 Join
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="room-info" style={{ textAlign: 'center' }}>
                        <div className="room-code-display" style={{ background: colors.card, padding: '0.5rem', borderRadius: '4px', border: `1px solid ${colors.border}`, display: 'inline-block', marginBottom: '0.5rem' }}>
                            <span className="label" style={{ color: colors.textSec, marginRight: '0.5rem' }}>Room Code:</span>
                            <span className="code" style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '1.2rem', color: colors.accent }}>{roomCode}</span>
                        </div>
                        <div className="player-color" style={{ fontWeight: 'bold', marginBottom: '0.75rem' }}>
                            {playerColor === 'white' ? '⚪ White' : '⚫ Black'} Player
                        </div>
                        {/* Share Link Button */}
                        <button
                            onClick={() => {
                                const link = `${window.location.origin}/game/${roomCode}`;
                                navigator.clipboard.writeText(link);
                                alert('Link copied! Share it with your friend.');
                            }}
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                background: '#22c55e',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            🔗 Copy Invite Link
                        </button>
                    </div>
                )}
            </div>

            <div className="instructions" style={{ fontSize: '0.9rem', color: colors.textSec }}>
                <h4 style={{ color: colors.text, marginBottom: '0.5rem' }}>📖 How to Play</h4>
                <ul style={{ paddingLeft: '1.5rem', margin: 0 }}>
                    <li>Click a piece to select it</li>
                    <li>Green dots show valid moves</li>
                    <li>Click a valid square to move</li>
                    <li>White moves first</li>
                </ul>
            </div>
        </div>
    );
});

Controls.displayName = 'Controls';

export default Controls;
