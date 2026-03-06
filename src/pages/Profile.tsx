import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function Profile() {
    const { uid } = useParams();
    const { currentUser } = useAuth()!;
    const { colors } = useTheme();
    const navigate = useNavigate();

    const targetUid = uid || currentUser?.uid;

    const [profile, setProfile] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!targetUid) return;
        setLoading(true);
        const firebase = (window as any).firebase;
        const db = firebase.database();

        // Fetch User Info
        const userPromise = db.ref(`users/${targetUid}`).once('value');
        // Fetch Stats
        const statsPromise = db.ref(`users/${targetUid}/stats`).once('value');
        // Fetch History
        const historyPromise = db.ref(`users/${targetUid}/history`).orderByChild('timestamp').limitToLast(20).once('value');

        Promise.all([userPromise, statsPromise, historyPromise]).then(([userSnap, statsSnap, histSnap]) => {
            if (!userSnap.exists()) {
                setProfile(null);
            } else {
                setProfile(userSnap.val());
                setStats(statsSnap.val() || { wins: 0, losses: 0, draws: 0, games: 0 });

                const histData = histSnap.val();
                if (histData) {
                    const list = Object.values(histData).sort((a: any, b: any) => b.timestamp - a.timestamp);
                    setHistory(list);
                } else {
                    setHistory([]);
                }
            }
            setLoading(false);
        });

    }, [targetUid]);

    if (!targetUid) return <div style={{ color: colors.text }}>Invalid User</div>;
    if (loading) return <div style={{ padding: '2rem', color: colors.textSec }}>Loading profile...</div>;
    if (!profile) return <div style={{ padding: '2rem', color: colors.danger }}>User not found.</div>;

    const winRate = stats.games > 0 ? Math.round((stats.wins / stats.games) * 100) : 0;

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem', paddingBottom: '2rem', color: colors.text }}>

            {/* Header Card */}
            <div className="card" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem', background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '1.5rem' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: colors.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 'bold' }}>
                    {profile.nickname?.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h1 style={{ margin: 0, color: colors.text, fontSize: '2rem' }}>{profile.nickname}</h1>
                    <div style={{ color: colors.textSec, marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{
                            display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%',
                            background: profile.status === 'online' ? colors.success : (profile.status === 'playing' ? colors.accent : colors.textSec)
                        }}></span>
                        <span style={{ textTransform: 'uppercase', fontSize: '0.9rem', fontWeight: 'bold' }}>
                            {profile.status === 'online' ? 'Online' : (profile.status === 'playing' ? 'In Game' : 'Offline')}
                        </span>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid-responsive" style={{ marginBottom: '2rem', display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' }}>
                <div className="card" style={{ textAlign: 'center', background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '1rem' }}>
                    <div className="text-bold" style={{ fontSize: '1.5rem', marginBottom: '0.25rem', color: '#eab308' }}>{stats.eloTamerlane || 1200}</div>
                    <div className="text-uppercase" style={{ fontSize: '0.7rem', color: colors.textSec }}>Tamerlane ELO</div>
                </div>
                <div className="card" style={{ textAlign: 'center', background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '1rem' }}>
                    <div className="text-bold" style={{ fontSize: '1.5rem', marginBottom: '0.25rem', color: '#eab308' }}>{stats.eloClassic || 1200}</div>
                    <div className="text-uppercase" style={{ fontSize: '0.7rem', color: colors.textSec }}>Classic ELO</div>
                </div>
                <div className="card" style={{ textAlign: 'center', background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '1rem' }}>
                    <div className="text-bold" style={{ fontSize: '1.5rem', marginBottom: '0.25rem', color: colors.success }}>{stats.wins}</div>
                    <div className="text-uppercase" style={{ fontSize: '0.7rem', color: colors.textSec }}>Wins</div>
                </div>
                <div className="card" style={{ textAlign: 'center', background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '1rem' }}>
                    <div className="text-bold" style={{ fontSize: '1.5rem', marginBottom: '0.25rem', color: colors.danger }}>{stats.losses}</div>
                    <div className="text-uppercase" style={{ fontSize: '0.7rem', color: colors.textSec }}>Losses</div>
                </div>
                <div className="card" style={{ textAlign: 'center', background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '1rem' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#a855f7', marginBottom: '0.25rem' }}>{winRate}%</div>
                    <div className="text-uppercase" style={{ fontSize: '0.7rem', color: colors.textSec }}>Win Rate</div>
                </div>
            </div>

            {/* Match History */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '12px' }}>
                <div style={{ padding: '1.5rem', borderBottom: `1px solid ${colors.border}` }}>
                    <h3 style={{ margin: 0, color: colors.text }}>Match History (Last 20)</h3>
                </div>

                {history.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: colors.textSec, fontStyle: 'italic' }}>No matches found.</div>
                ) : (
                    <div>
                        {history.map((match, idx) => (
                            <div key={idx} style={{
                                padding: '0.75rem 1rem',
                                borderBottom: idx < history.length - 1 ? `1px solid ${colors.border}` : 'none',
                                background: idx % 2 === 0 ? 'transparent' : (colors.bg === '#121212' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)')
                            }}>
                                {/* Top Row: Game Type + Date */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <div style={{
                                        padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold',
                                        background: match.gameType === 'classic' ? colors.textSec : '#7c3aed',
                                        color: '#fff'
                                    }}>
                                        {match.gameType === 'classic' ? 'CLASSIC' : 'TAMERLANE'}
                                    </div>
                                    <div style={{ color: colors.textSec, fontSize: '0.75rem' }}>{new Date(match.timestamp).toLocaleDateString()}</div>
                                </div>
                                
                                {/* Bottom Row: Players + Result */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <div style={{ fontSize: '0.9rem', color: colors.text }}>
                                        <span style={{ fontWeight: 'bold' }}>{profile.nickname}</span>
                                        <span style={{ margin: '0 0.4rem', color: colors.textSec, fontSize: '0.8rem' }}>vs</span>
                                        <span style={{ fontWeight: 'bold' }}>{match.opponent || 'Opponent'}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{
                                            padding: '0.2rem 0.5rem', borderRadius: '4px',
                                            fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase',
                                            color: match.result === 'win' ? colors.success : (match.result === 'loss' ? colors.danger : '#eab308'),
                                            background: match.result === 'win' ? 'rgba(34, 197, 94, 0.15)' : (match.result === 'loss' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(234, 179, 8, 0.15)')
                                        }}>
                                            {match.result || 'DRAW'}
                                        </span>
                                        {match.ratingChange !== undefined && (
                                            <span style={{
                                                fontSize: '0.8rem', fontWeight: 'bold',
                                                color: match.ratingChange > 0 ? colors.success : (match.ratingChange < 0 ? colors.danger : colors.textSec)
                                            }}>
                                                {match.ratingChange > 0 ? '+' : ''}{match.ratingChange}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}


