import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Game from '../components/Game';
import TimurImg from '../assets/timur.jpg';
import { FaHistory, FaChessKnight, FaBookOpen, FaSignOutAlt, FaPlay, FaChess, FaUser, FaEnvelope } from 'react-icons/fa';

export default function Home() {
    const { currentUser, logout } = useAuth() || {};
    const navigate = useNavigate();

    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);



    const handleLogout = async () => {
        try {
            if (logout) await logout();
            navigate('/login');
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#121212', color: '#e0e0e0', fontFamily: "'Inter', sans-serif" }}>

            {/* Prominent Navbar - Responsive */}
            <nav style={{
                background: '#1e1e1e',
                borderBottom: '1px solid #333',
                padding: '0.75rem 1rem',
                position: 'sticky',
                top: 0,
                zIndex: 50,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}>
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    flexWrap: 'nowrap',
                    gap: '0.5rem',
                    maxWidth: '1400px',
                    margin: '0 auto'
                }}>
                    {/* Logo */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                        <span style={{ fontSize: '1.8rem' }}>♟</span>
                        <div style={{
                            fontSize: '1.1rem', fontWeight: '800',
                            background: 'linear-gradient(90deg, #60a5fa, #a78bfa)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            whiteSpace: 'nowrap'
                        }}>
                            Tamerlane Chess
                        </div>
                    </div>

                    {/* Auth Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                        {currentUser ? (
                            <>
                                <span style={{ 
                                    fontSize: '0.75rem', 
                                    color: '#fff', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '0.3rem',
                                    background: 'rgba(255,255,255,0.1)',
                                    padding: '0.3rem 0.5rem',
                                    borderRadius: '20px'
                                }}>
                                    <FaUser style={{ fontSize: '0.7rem', color: '#9ca3af' }} />
                                    {currentUser.nickname || 'Player'}
                                </span>
                                <Link to="/lobby" style={{ 
                                    padding: '0.4rem 0.75rem', 
                                    fontSize: '0.75rem', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '0.3rem',
                                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                    color: '#fff',
                                    borderRadius: '6px',
                                    textDecoration: 'none',
                                    fontWeight: 'bold'
                                }}>
                                    <FaPlay style={{ fontSize: '0.65rem' }} /> Play
                                </Link>
                                <button onClick={handleLogout} style={{ 
                                    padding: '0.4rem 0.5rem', 
                                    fontSize: '0.75rem', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '0.3rem',
                                    background: 'transparent',
                                    color: '#ef4444',
                                    border: '1px solid #ef4444',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                }}>
                                    <FaSignOutAlt style={{ fontSize: '0.65rem' }} />
                                </button>
                            </>
                        ) : (
                            <>
                                <Link to="/login" style={{ 
                                    fontSize: '0.8rem', 
                                    padding: '0.4rem 0.6rem', 
                                    color: '#60a5fa',
                                    textDecoration: 'none',
                                    whiteSpace: 'nowrap'
                                }}>Sign In</Link>
                                <Link to="/register" style={{ 
                                    fontSize: '0.8rem', 
                                    padding: '0.4rem 0.6rem', 
                                    background: '#1e40af', 
                                    color: '#fff', 
                                    borderRadius: '6px',
                                    textDecoration: 'none',
                                    fontWeight: 'bold',
                                    whiteSpace: 'nowrap'
                                }}>Sign Up</Link>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="container flex-col flex-center" style={{ padding: '3rem 1rem', maxWidth: '1400px' }}>

                {/* Offline Mode Banner */}
                {!currentUser && (
                    <div className="flex-center" style={{
                        marginBottom: '2rem', background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc',
                        padding: '0.75rem 2rem', borderRadius: '50px', fontSize: '1rem',
                        border: '1px solid rgba(99, 102, 241, 0.3)', gap: '0.5rem'
                    }}>
                        <span style={{ fontSize: '1.2rem' }}>👀</span>
                        <span>You are currently playing in <strong>Offline Demo Mode</strong>. Log in to play vs others!</span>
                    </div>
                )}

                {/* Game Board Area */}
                <div className="local-game-board-area" style={{ marginBottom: '5rem', width: '100%', display: 'flex', justifyContent: 'center' }}>
                    <div style={{
                        padding: '1rem', background: '#1a1a1a', borderRadius: '16px',
                        border: '1px solid #333', boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                    }}>
                        <Game mode="local" />
                    </div>
                </div>

                {/* GAME GUIDE SECTION */}
                <div id="guide" style={{ width: '100%', maxWidth: '1000px' }}>
                    <div className="flex-between" style={{ marginBottom: '2rem', borderBottom: '1px solid #333', paddingBottom: '1rem' }}>
                        <h2 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#fff', margin: 0 }}>Game Guide</h2>
                        <div className="text-muted" style={{ fontSize: '1.1rem' }}>Rules & Strategy</div>
                    </div>

                    {/* Intro */}
                    <div className="card" style={{ marginBottom: '3rem', background: 'linear-gradient(135deg, #1e1e1e, #252525)', padding: '2rem' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'center' }}>
                            <div style={{ flex: '1 1 400px' }}>
                                <h3 style={{ color: '#fbbf24', fontSize: '1.8rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    History of Tamerlane Chess
                                </h3>
                                <p style={{ lineHeight: '1.8', fontSize: '1.05rem', color: '#d4d4d4', marginBottom: '1rem' }}>
                                    <strong>Amir Timur (Tamerlane)</strong>, the legendary conqueror and founder of the Timurid Empire, was a strategic genius who found classic 8x8 chess too simple for his mind. He favored this larger <strong>11x10 variant</strong>, known as <em>Shatranj Kamil</em> (Perfect Chess), which better simulated the complexities of medieval warfare.
                                </p>
                                <p style={{ lineHeight: '1.8', fontSize: '1.05rem', color: '#d4d4d4' }}>
                                    The game features unique pieces like <strong>Giraffes, Dabbabahs, and Camels</strong>, each moving in distinct ways to control the larger board. Tamerlane Chess requires deep tactical foresight and adaptability, mirroring the very skills that allowed Timur to build one of history's vastest empires.
                                </p>
                            </div>
                            <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <img
                                    src={TimurImg}
                                    alt="Amir Timur"
                                    style={{
                                        width: '100%',
                                        maxWidth: '350px',
                                        borderRadius: '12px',
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                                        border: '2px solid #fbbf24'
                                    }}

                                />
                                <span style={{ marginTop: '0.8rem', fontSize: '1.2rem', color: '#fbbf24', fontFamily: 'serif', letterSpacing: '1px' }}>
                                    Timur
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Pieces Grid */}
                    <div style={{ marginBottom: '4rem' }}>
                        <h3 style={{ color: '#60a5fa', fontSize: '1.8rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FaChessKnight /> The Pieces
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
                            <PieceCard name="General" imageSrc="/images/wAdvisor.png" desc="Moves one step diagonally." />
                            <PieceCard name="Vizier" imageSrc="/images/wMinister.png" desc="Moves one step orthogonally (up, down, left, right)." />
                            <PieceCard name="Giraffe" imageSrc="/images/wGiraffe.png" desc="Moves one diagonal step, then at least 3 straight steps." />
                            <PieceCard name="Picket" imageSrc="/images/wCatapult.png" desc="Moves like a Bishop but must move at least 2 steps." />
                            <PieceCard name="Knight" imageSrc="/images/wKnight.png" desc="Moves in an 'L' shape (same as modern chess)." />
                            <PieceCard name="Rook" imageSrc="/images/wRook.png" desc="Moves any number of squares orthogonally." />
                            <PieceCard name="Elephant" imageSrc="/images/wElephant.png" desc="Moves two squares diagonally (can jump)." />
                            <PieceCard name="Camel" imageSrc="/images/wCamel.png" desc="Moves one diagonal and two straight (long Knight jump)." />
                            <PieceCard name="Dabbaba" imageSrc="/images/wWarengine.png" desc="Moves two squares orthogonally." />
                            <PieceCard name="Pawn" imageSrc="/images/wPawnPawn.png" desc="Moves forward. Each pawn promotes to a specific piece." />
                        </div>
                    </div>

                    {/* Rules */}
                    <div style={{ marginBottom: '4rem' }}>
                        <h3 style={{ color: '#f87171', fontSize: '1.8rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FaBookOpen /> Core Rules
                        </h3>
                        <div className="card" style={{ padding: '2rem' }}>
                            <ul style={{ paddingLeft: '1.5rem', opacity: 0.9, fontSize: '1.1rem', lineHeight: '1.8', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <li>
                                    <strong style={{ color: '#fff' }}>The Board:</strong> 11x10 squares + 2 Citadels. Code adds extra width for pieces.
                                </li>
                                <li>
                                    <strong style={{ color: '#fff' }}>Winning:</strong> Checkmate the opponent's Shah (King). Alternatively, bare the opponent's king (capture all other pieces).
                                </li>
                                <li>
                                    <strong style={{ color: '#fff' }}>Promotion:</strong> Pawns don't just become Queens. A 'Pawn of Rooks' becomes a Rook, a 'Pawn of Giraffes' becomes a Giraffe, etc.
                                </li>
                                <li>
                                    <strong style={{ color: '#fff' }}>Citadels:</strong> The extra squares on the sides (sanctuaries) can only be entered by the King under specific conditions to force a draw.
                                </li>
                            </ul>
                        </div>
                    </div>

                </div>

            </main>
        </div>
    );
}

function PieceCard({ name, imageSrc, desc }: { name: string, imageSrc: string, desc: string }) {
    return (
        <div style={{
            background: '#262626', padding: '1.5rem', borderRadius: '12px', border: '1px solid #333', textAlign: 'center',
            transition: 'transform 0.2s', cursor: 'default'
        }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
            <div style={{ height: '80px', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={imageSrc} alt={name} style={{ maxHeight: '100%', maxWidth: '100%', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))' }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerHTML = '<span style="font-size:3rem">♟️</span>' }}
                />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#fff' }}>{name}</h3>
            <p style={{ fontSize: '0.95rem', color: '#a3a3a3', lineHeight: '1.4' }}>{desc}</p>
        </div>
    );
}
