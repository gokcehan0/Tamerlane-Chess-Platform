import React from 'react';
import { Link } from 'react-router-dom';
import TimurImg from '../assets/timur.jpg';
import { FaHistory, FaChessKnight, FaBookOpen } from 'react-icons/fa';
import { useTheme } from '../contexts/ThemeContext';

export default function Docs() {
    const { colors } = useTheme();

    return (
        <div style={{
            minHeight: '100vh',
            fontFamily: "'Inter', sans-serif",
            padding: '2rem',
            lineHeight: '1.6',
            color: colors.text
        }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <Link to="/" style={{ color: colors.accent, textDecoration: 'none', display: 'inline-block', marginBottom: '2rem' }}>← Back to Home</Link>

                <header style={{ marginBottom: '3rem', borderBottom: `1px solid ${colors.border}`, paddingBottom: '2rem' }}>
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: colors.text }}>Tamerlane Chess</h1>
                    <p style={{ fontSize: '1.1rem', opacity: 0.7, color: colors.textSec }}>
                        An ancient strategy game played by Emperor Tamerlane, featuring a larger board and unique pieces.
                    </p>
                </header>

                <section style={{ marginBottom: '3rem' }}>
                    <div className="card" style={{ background: colors.card, padding: '2rem', borderRadius: '12px', border: `1px solid ${colors.border}` }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'center' }}>
                            <div style={{ flex: '1 1 400px' }}>
                                <h2 style={{ color: colors.accent, fontSize: '1.8rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    History
                                </h2>
                                <p style={{ lineHeight: '1.8', fontSize: '1.05rem', color: colors.text, marginBottom: '1rem' }}>
                                    <strong>Amir Timur (Tamerlane)</strong>, the legendary conqueror and founder of the Timurid Empire, was a strategic genius who found classic 8x8 chess too simple for his mind. He favored this larger <strong>11x10 variant</strong>, known as <em>Shatranj Kamil</em> (Perfect Chess), which better simulated the complexities of medieval warfare.
                                </p>
                                <p style={{ lineHeight: '1.8', fontSize: '1.05rem', color: colors.text }}>
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
                                        border: `2px solid ${colors.accent}`
                                    }}
                                />
                                <span style={{ marginTop: '0.8rem', fontSize: '1.2rem', color: colors.accent, fontFamily: 'serif', letterSpacing: '1px' }}>
                                    Timur
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                <section style={{ marginBottom: '3rem' }}>
                    <h2 style={{ color: colors.success, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FaChessKnight /> The Pieces
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                        <PieceCard name="General" imageSrc="/images/wAdvisor.png" desc="Moves one step diagonally." colors={colors} />
                        <PieceCard name="Vizier" imageSrc="/images/wMinister.png" desc="Moves one step orthogonally (up, down, left, right)." colors={colors} />
                        <PieceCard name="Giraffe" imageSrc="/images/wGiraffe.png" desc="Moves one diagonal step, then at least 3 straight steps." colors={colors} />
                        <PieceCard name="Picket" imageSrc="/images/wCatapult.png" desc="Moves like a Bishop but must move at least 2 steps." colors={colors} />
                        <PieceCard name="Knight" imageSrc="/images/wKnight.png" desc="Moves in an 'L' shape (same as modern chess)." colors={colors} />
                        <PieceCard name="Rook" imageSrc="/images/wRook.png" desc="Moves any number of squares orthogonally." colors={colors} />
                        <PieceCard name="Elephant" imageSrc="/images/wElephant.png" desc="Moves two squares diagonally (can jump)." colors={colors} />
                        <PieceCard name="Camel" imageSrc="/images/wCamel.png" desc="Moves one diagonal and two straight (long Knight jump)." colors={colors} />
                        <PieceCard name="Dabbaba" imageSrc="/images/wWarengine.png" desc="Moves two squares orthogonally." colors={colors} />
                        <PieceCard name="Pawn" imageSrc="/images/wPawnPawn.png" desc="Moves forward. Each pawn promotes to a specific piece." colors={colors} />
                    </div>
                </section>

                <section style={{ marginBottom: '3rem' }}>
                    <h2 style={{ color: colors.danger, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FaBookOpen /> Rules
                    </h2>
                    <ul style={{ paddingLeft: '1.5rem', opacity: 0.9, color: colors.text }}>
                        <li style={{ marginBottom: '0.5rem' }}><strong>The Board:</strong> 11x10 squares with 2 Citadels (special sanctuaries for the King).</li>
                        <li style={{ marginBottom: '0.5rem' }}><strong>Winning:</strong> Checkmate the opponent's Shah (King) or bare the opponent's King (capture all other pieces).</li>
                        <li style={{ marginBottom: '0.5rem' }}><strong>Promotion:</strong> Pawns promote based on their file (column). For example, a Rook's Pawn becomes a Rook, a Giraffe's Pawn becomes a Giraffe.</li>
                        <li style={{ marginBottom: '0.5rem' }}><strong>Citadels:</strong> The extra squares on the sides can only be entered by the King as a last resort to force a draw (in some rule variants).</li>
                    </ul>
                </section>
            </div>
        </div>
    );
}

function PieceCard({ name, imageSrc, desc, colors }: { name: string, imageSrc: string, desc: string, colors: any }) {
    return (
        <div style={{ background: colors.card, padding: '1rem', borderRadius: '8px', border: `1px solid ${colors.border}`, textAlign: 'center' }}>
            <div style={{ height: '64px', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={imageSrc} alt={name} style={{ maxHeight: '100%', maxWidth: '100%' }} />
            </div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: colors.text }}>{name}</h3>
            <p style={{ fontSize: '0.9rem', opacity: 0.7, color: colors.textSec }}>{desc}</p>
        </div>
    );
}
