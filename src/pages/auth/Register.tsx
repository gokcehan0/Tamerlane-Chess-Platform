import React, { useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { validatePassword, getStrengthColor, getStrengthLabel } from '../../utils/passwordValidator';
import { validateNickname, MAX_NICKNAME_LENGTH } from '../../utils/nicknameValidator';

export default function Register() {
    const emailRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const passwordConfirmRef = useRef<HTMLInputElement>(null);
    const nicknameRef = useRef<HTMLInputElement>(null);
    const { signup } = useAuth()!;
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    const { showToast } = useToast();

    const passwordValidation = validatePassword(password);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        // XSS Protection: Validate nickname
        const nicknameValidation = validateNickname(nicknameRef.current!.value);
        if (!nicknameValidation.isValid) {
            return setError(nicknameValidation.errors[0]);
        }

        // Validate password strength
        if (!passwordValidation.isValid) {
            return setError(passwordValidation.errors[0]);
        }

        if (passwordRef.current!.value !== passwordConfirmRef.current!.value) {
            return setError('Passwords do not match');
        }

        try {
            setError('');
            setLoading(true);
            await signup(
                emailRef.current!.value,
                passwordRef.current!.value,
                nicknameValidation.sanitized  // Use sanitized nickname
            );
            showToast("Account created! Please verify your email.", 'success');
            navigate('/verify-email');
        } catch (err: any) {
            let msg = 'Failed to create an account.';
            if (err.code === 'auth/email-already-in-use') msg = 'This email is already registered. Please Log In instead.';
            else if (err.code === 'auth/invalid-email') msg = 'Invalid email address.';
            else if (err.code === 'auth/weak-password') msg = 'Password is too weak. Use at least 8 characters.';
            else if (err.code === 'auth/network-request-failed') msg = 'Network error. Please check your connection.';
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
        marginBottom: '0.5rem',
        background: '#333',
        border: '1px solid #444',
        borderRadius: '6px',
        color: 'white',
        fontSize: '1rem'
    };

    const buttonStyle: React.CSSProperties = {
        width: '100%',
        padding: '0.75rem',
        background: 'linear-gradient(135deg, #10b981, #059669)',
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

    const checkStyle = (passed: boolean): React.CSSProperties => ({
        fontSize: '0.75rem',
        color: passed ? '#10b981' : '#6b7280',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
    });

    return (
        <div style={containerStyle}>
            <div style={cardStyle}>
                <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '1.8rem' }}>Sign Up</h2>

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
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#a3a3a3' }}>Nickname</label>
                        <input type="text" ref={nicknameRef} required style={{...inputStyle, marginBottom: '1rem'}} placeholder="Choose a public display name" />
                    </div>
                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#a3a3a3' }}>Email</label>
                        <input type="email" ref={emailRef} required style={{...inputStyle, marginBottom: '1rem'}} placeholder="Enter your email" />
                    </div>
                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#a3a3a3' }}>Password</label>
                        <input 
                            type="password" 
                            ref={passwordRef} 
                            required 
                            style={inputStyle} 
                            placeholder="Create a password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        
                        {/* Password Strength Indicator */}
                        {password && (
                            <div style={{ marginBottom: '1rem' }}>
                                {/* Strength Bar */}
                                <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px',
                                    marginBottom: '8px'
                                }}>
                                    <div style={{
                                        flex: 1,
                                        height: '4px',
                                        background: '#333',
                                        borderRadius: '2px',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            width: passwordValidation.strength === 'weak' ? '33%' : 
                                                   passwordValidation.strength === 'medium' ? '66%' : '100%',
                                            height: '100%',
                                            background: getStrengthColor(passwordValidation.strength),
                                            transition: 'all 0.3s ease'
                                        }} />
                                    </div>
                                    <span style={{ 
                                        fontSize: '0.75rem', 
                                        color: getStrengthColor(passwordValidation.strength),
                                        fontWeight: 'bold',
                                        minWidth: '60px'
                                    }}>
                                        {getStrengthLabel(passwordValidation.strength)}
                                    </span>
                                </div>
                                
                                {/* Requirements Checklist */}
                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '4px'
                                }}>
                                    <span style={checkStyle(passwordValidation.checks.minLength)}>
                                        {passwordValidation.checks.minLength ? '✓' : '○'} 8+ characters
                                    </span>
                                    <span style={checkStyle(passwordValidation.checks.hasUppercase)}>
                                        {passwordValidation.checks.hasUppercase ? '✓' : '○'} Uppercase
                                    </span>
                                    <span style={checkStyle(passwordValidation.checks.hasLowercase)}>
                                        {passwordValidation.checks.hasLowercase ? '✓' : '○'} Lowercase
                                    </span>
                                    <span style={checkStyle(passwordValidation.checks.hasNumber)}>
                                        {passwordValidation.checks.hasNumber ? '✓' : '○'} Number
                                    </span>
                                    <span style={checkStyle(passwordValidation.checks.hasSpecial)}>
                                        {passwordValidation.checks.hasSpecial ? '✓' : '○'} Special char
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#a3a3a3' }}>Confirm Password</label>
                        <input type="password" ref={passwordConfirmRef} required style={{...inputStyle, marginBottom: '0'}} placeholder="Confirm your password" />
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading || !passwordValidation.isValid} 
                        style={{
                            ...buttonStyle,
                            opacity: (loading || !passwordValidation.isValid) ? 0.5 : 1,
                            cursor: (loading || !passwordValidation.isValid) ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {loading ? 'Creating Account...' : 'Sign Up'}
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
                    Already have an account? <Link to="/login" style={linkStyle}>Log In</Link>
                </div>
                <div style={{ marginTop: '0.5rem', textAlign: 'center', fontSize: '0.9rem', borderTop: '1px solid #333', paddingTop: '1rem' }}>
                    <Link to="/" style={{ color: '#a3a3a3', textDecoration: 'none' }}>← Back to Home</Link>
                </div>
            </div>
        </div>
    );
}
