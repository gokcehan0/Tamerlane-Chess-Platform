import React, { useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

export default function Login() {
    const emailRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const { login, currentUser } = useAuth()!;
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    React.useEffect(() => {
        if (currentUser) {
            navigate('/lobby');
        }
    }, [currentUser, navigate]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        try {
            setError('');
            setLoading(true);
            await login(emailRef.current!.value, passwordRef.current!.value);
            navigate('/lobby');
        } catch (err: any) {
            let msg = 'Failed to sign in.';
            if (err.code === 'auth/wrong-password') msg = 'Incorrect password.';
            else if (err.code === 'auth/user-not-found') msg = 'No account found with this email.';
            else if (err.code === 'auth/invalid-email') msg = 'Invalid email address.';
            else if (err.code === 'auth/too-many-requests') msg = 'Too many failed attempts. Try again later.';
            else if (err.code === 'auth/network-request-failed') msg = 'Network error. Please check your connection.';
            else if (err.code === 'auth/invalid-credential') msg = 'Invalid email or password.';
            setError(msg);
        }

        setLoading(false);
    }

    const containerStyle: React.CSSProperties = {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1a1a',
        color: '#e5e5e5',
        fontFamily: "'Inter', sans-serif"
    };

    const cardStyle: React.CSSProperties = {
        background: '#262626',
        padding: '2rem',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        width: '100%',
        maxWidth: '400px',
        border: '1px solid #404040'
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '0.75rem',
        marginBottom: '1rem',
        background: '#333',
        border: '1px solid #444',
        borderRadius: '6px',
        color: 'white',
        fontSize: '1rem'
    };

    const buttonStyle: React.CSSProperties = {
        width: '100%',
        padding: '0.75rem',
        background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '1rem',
        fontWeight: 'bold',
        cursor: loading ? 'not-allowed' : 'pointer',
        marginTop: '1rem',
        opacity: loading ? 0.7 : 1
    };

    const linkStyle: React.CSSProperties = {
        color: '#818cf8',
        textDecoration: 'none',
        fontSize: '0.9rem'
    };

    return (
        <div style={containerStyle}>
            <div style={cardStyle}>
                <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '1.8rem' }}>Login</h2>

                {error && <div style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#fca5a5',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    marginBottom: '1rem',
                    textAlign: 'center'
                }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#a3a3a3' }}>Email</label>
                        <input type="email" ref={emailRef} required style={inputStyle} placeholder="Enter your email" />
                    </div>
                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#a3a3a3' }}>Password</label>
                        <input type="password" ref={passwordRef} required style={inputStyle} placeholder="Enter your password" />
                    </div>

                    <button type="submit" disabled={loading} style={buttonStyle}>
                        {loading ? 'Logging In...' : 'Log In'}
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                    <Link to="/forgot-password" style={linkStyle}>Forgot Password?</Link>
                </div>
                <div style={{ marginTop: '0.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
                    Need an account? <Link to="/register" style={linkStyle}>Sign Up</Link>
                </div>
                <div style={{ marginTop: '0.5rem', textAlign: 'center', fontSize: '0.9rem', borderTop: '1px solid #333', paddingTop: '1rem' }}>
                    <Link to="/" style={{ color: '#a3a3a3', textDecoration: 'none' }}>← Back to Home</Link>
                </div>
            </div>
        </div>
    );
}
