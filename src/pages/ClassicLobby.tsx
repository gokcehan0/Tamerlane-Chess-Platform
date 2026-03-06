import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOnlineGame } from '../hooks/useOnlineGame';
import { useNavigate } from 'react-router-dom';
import { useRateLimit } from '../hooks/useRateLimit';
import { useTheme } from '../contexts/ThemeContext';

export default function ClassicLobby() {
    const { currentUser } = useAuth()!;
    const online = useOnlineGame();
    const navigate = useNavigate();

    const [joinCode, setJoinCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Lobby States
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedSide, setSelectedSide] = useState<'random' | 'white' | 'black'>('random');
    const [timeControl, setTimeControl] = useState<number | null>(null);

    // Security: Rate Limiting
    const { checkRateLimit } = useRateLimit(2000);

    async function handleCreateRoom() {
        if (!checkRateLimit()) {
            setError('Please wait a moment before creating another room.');
            return;
        }

        if (!currentUser?.emailVerified) {
            setError('Please verify your email address to create rooms.');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const options = {
                side: selectedSide,
                timeControl: timeControl ? timeControl * 60 : null,
                gameType: 'classic' as const // NEW: Mark this as a Classic Chess game
            };
            const code = await online.createRoom(options);
            navigate(`/game/classic/${code}`); // Navigate to classic game route
        } catch (err: any) {
            setError('Fail: ' + err.message);
        }
        setLoading(false);
        setShowCreateModal(false);
    }

    async function handleJoinRoom(e: React.FormEvent) {
        e.preventDefault();

        if (!checkRateLimit()) {
            setError('Please wait a moment before trying again.');
            return;
        }

        setError('');
        setLoading(true);
        try {
            const code = joinCode.toUpperCase().trim();

            if (!/^[A-Z0-9]+$/.test(code)) {
                throw new Error("Invalid room code format. Use only letters and numbers.");
            }

            if (code.length < 4) throw new Error("Invalid code length");

            await online.joinRoom(code);
            navigate(`/game/classic/${code}`); // Navigate to classic game route
        } catch (err: any) {
            setError(err.message);
        }
        setLoading(false);
    }

    const { colors } = useTheme();

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', color: colors.text, marginBottom: '0.5rem' }}>Classic Chess Lobby</h1>
                <p style={{ color: colors.textSec }}>Play standard 8x8 chess with your friends online.</p>
                {error && <p style={{ color: colors.danger, marginTop: '1rem' }}>{error}</p>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '2rem' }}>

                {/* Create Room Card */}
                <div style={{ background: colors.card, padding: '2rem', borderRadius: '12px', border: `1px solid ${colors.border}`, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>♟️</div>
                    <h3 style={{ fontSize: '1.25rem', color: colors.text, marginBottom: '0.5rem' }}>Create Classic Match</h3>
                    <p style={{ color: colors.textSec, marginBottom: '1.5rem' }}>Start a standard 8x8 chess game. Share the room code with a friend.</p>

                    <button
                        onClick={() => setShowCreateModal(true)}
                        disabled={loading || !currentUser?.emailVerified}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            background: currentUser?.emailVerified ? colors.accent : colors.textSec,
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            cursor: currentUser?.emailVerified ? 'pointer' : 'not-allowed'
                        }}>
                        {loading ? 'Creating...' : 'Create Room'}
                    </button>
                    {!currentUser?.emailVerified && <p style={{ fontSize: '0.8rem', color: colors.danger, marginTop: '0.5rem' }}>Valid email required to create.</p>}
                </div>

                {/* Join Room Card */}
                <div style={{ background: colors.card, padding: '2rem', borderRadius: '12px', border: `1px solid ${colors.border}`, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔗</div>
                    <h3 style={{ fontSize: '1.25rem', color: colors.text, marginBottom: '0.5rem' }}>Join by Code</h3>
                    <p style={{ color: colors.textSec, marginBottom: '1.5rem' }}>Enter the room code shared by your friend.</p>

                    <form onSubmit={handleJoinRoom} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <input
                            type="text"
                            placeholder="ROOM CODE"
                            value={joinCode}
                            onChange={e => setJoinCode(e.target.value)}
                            style={{ padding: '0.75rem', background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '6px', fontSize: '1rem', textTransform: 'uppercase', color: colors.text }}
                        />
                        <button
                            type="submit"
                            disabled={loading || joinCode.length < 4}
                            style={{ padding: '0.75rem', background: colors.sidebar, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                            {loading ? 'Joining...' : 'Join Game'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Create Room Modal */}
            {showCreateModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
                }}>
                    <div style={{ background: colors.card, padding: '2rem', borderRadius: '8px', width: '90%', maxWidth: '400px', border: `1px solid ${colors.border}` }}>
                        <h3 style={{ color: colors.text, marginBottom: '1.5rem' }}>Match Settings</h3>

                        {/* Side Selection */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', color: colors.textSec, marginBottom: '0.5rem' }}>Play As</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {['white', 'random', 'black'].map(side => (
                                    <button
                                        key={side}
                                        onClick={() => setSelectedSide(side as any)}
                                        style={{
                                            flex: 1, padding: '0.5rem',
                                            background: selectedSide === side ? colors.accent : colors.bg,
                                            color: selectedSide === side ? '#fff' : colors.text, border: selectedSide === side ? 'none' : `1px solid ${colors.border}`, borderRadius: '4px', textTransform: 'capitalize'
                                        }}
                                    >
                                        {side}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Time Control */}
                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', color: colors.textSec, marginBottom: '0.5rem' }}>Time Control</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                {[null, 10, 15, 30].map(min => (
                                    <button
                                        key={min || 'unlimited'}
                                        onClick={() => setTimeControl(min)}
                                        style={{
                                            padding: '0.5rem',
                                            background: timeControl === min ? colors.accent : colors.bg,
                                            color: timeControl === min ? '#fff' : colors.text, border: timeControl === min ? 'none' : `1px solid ${colors.border}`, borderRadius: '4px'
                                        }}
                                    >
                                        {min ? `${min} min` : 'Unlimited'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button onClick={() => setShowCreateModal(false)} style={{ flex: 1, padding: '0.75rem', background: 'transparent', color: colors.textSec, border: `1px solid ${colors.border}`, borderRadius: '4px' }}>Cancel</button>
                            <button onClick={handleCreateRoom} style={{ flex: 1, padding: '0.75rem', background: colors.success, color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>Create Match</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
