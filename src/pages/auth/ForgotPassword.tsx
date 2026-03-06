import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { FaLock, FaEnvelope, FaKey, FaArrowLeft } from 'react-icons/fa';
import { validatePassword } from '../../utils/passwordValidator';

export default function ForgotPassword() {
    const { sendAuthCode, resetPasswordWithCode } = useAuth()!;
    const { colors } = useTheme();
    const { showToast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<1 | 2>(1);
    const [email, setEmail] = useState('');
    
    // Step 2 Refs
    const codeRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const confirmPasswordRef = useRef<HTMLInputElement>(null);

    // Step 1: Send Code
    async function handleSendCode(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            await sendAuthCode(email, 'RESET');
            showToast("Recovery code sent to your email", 'success');
            setStep(2);
        } catch (error: any) {
            showToast("Failed to send code: " + error.message, 'error');
        } finally {
            setLoading(false);
        }
    }

    // Step 2: Reset Password
    async function handleReset(e: React.FormEvent) {
        e.preventDefault();
        
        const code = codeRef.current?.value;
        const pass = passwordRef.current?.value;
        const confirm = confirmPasswordRef.current?.value;

        if (!code || !pass || !confirm) {
            return showToast("Please fill all fields", 'error');
        }

        if (pass !== confirm) {
            return showToast("Passwords do not match", 'error');
        }

        const valid = validatePassword(pass);
        if (!valid.isValid) {
            return showToast("Password is too weak", 'error');
        }

        setLoading(true);
        try {
            await resetPasswordWithCode(email, code, pass);
            showToast("Password successfully reset! logging in...", 'success');
            setTimeout(() => navigate('/login'), 2000);
        } catch (error: any) {
            showToast("Failed to reset password: " + error.message, 'error');
            setLoading(false);
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: colors.bg,
            color: colors.text,
            padding: '1rem'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '420px',
                background: colors.card,
                padding: '2.5rem',
                borderRadius: '16px',
                boxShadow: colors.shadow,
                border: `1px solid ${colors.border}`
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ 
                        width: '64px', height: '64px', 
                        background: `${colors.accent}20`, 
                        color: colors.accent,
                        borderRadius: '50%', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.75rem', margin: '0 auto 1.5rem' 
                    }}>
                        <FaLock />
                    </div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.5rem', color: colors.text }}>
                        {step === 1 ? 'Reset Password' : 'New Password'}
                    </h2>
                    <p style={{ margin: 0, color: colors.textSec }}>
                        {step === 1 ? 'Enter your email to receive a recovery code.' : `Enter the code sent to ${email}`}
                    </p>
                </div>

                {step === 1 ? (
                    <form onSubmit={handleSendCode} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ position: 'relative' }}>
                            <FaEnvelope style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: colors.textSec }} />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email Address"
                                style={{
                                    width: '100%',
                                    padding: '1rem 1rem 1rem 3rem',
                                    background: colors.bg,
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: '12px',
                                    color: colors.text,
                                    fontSize: '1rem',
                                    outline: 'none'
                                }}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                padding: '1rem',
                                background: `linear-gradient(135deg, ${colors.accent}, ${colors.secondary})`,
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: '1rem',
                                fontWeight: 600,
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.7 : 1,
                                boxShadow: `0 4px 12px ${colors.accent}40`,
                                transition: 'transform 0.2s',
                            }}
                        >
                            {loading ? 'Sending...' : 'Send Recovery Code'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ position: 'relative' }}>
                            <label style={{ display: 'block', color: colors.textSec, fontSize: '0.85rem', marginBottom: '0.5rem' }}>6-Digit Code</label>
                            <FaKey style={{ position: 'absolute', left: '1rem', bottom: '1rem', color: colors.textSec }} />
                            <input
                                type="text"
                                placeholder="000000"
                                ref={codeRef}
                                maxLength={6}
                                required
                                style={{
                                    width: '100%',
                                    padding: '1rem 1rem 1rem 3rem',
                                    background: colors.bg,
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: '12px',
                                    color: colors.text,
                                    fontSize: '1.2rem',
                                    outline: 'none',
                                    letterSpacing: '8px', 
                                    fontWeight: 'bold',
                                    textAlign: 'center'
                                }}
                            />
                        </div>
                        <div style={{ position: 'relative' }}>
                            <FaKey style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: colors.textSec }} />
                            <input
                                type="password"
                                placeholder="New Password"
                                ref={passwordRef}
                                required
                                style={{
                                    width: '100%',
                                    padding: '1rem 1rem 1rem 3rem',
                                    background: colors.bg,
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: '12px',
                                    color: colors.text,
                                    fontSize: '1rem',
                                    outline: 'none'
                                }}
                            />
                        </div>
                        <div style={{ position: 'relative' }}>
                            <FaKey style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: colors.textSec }} />
                            <input
                                type="password"
                                placeholder="Confirm New Password"
                                ref={confirmPasswordRef}
                                required
                                style={{
                                    width: '100%',
                                    padding: '1rem 1rem 1rem 3rem',
                                    background: colors.bg,
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: '12px',
                                    color: colors.text,
                                    fontSize: '1rem',
                                    outline: 'none'
                                }}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                padding: '1rem',
                                background: `linear-gradient(135deg, ${colors.accent}, ${colors.secondary})`,
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: '1rem',
                                fontWeight: 600,
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.7 : 1,
                                boxShadow: `0 4px 12px ${colors.accent}40`
                            }}
                        >
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                )}

                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                    <Link to="/login" style={{ 
                        color: colors.textSec, 
                        textDecoration: 'none',
                        fontSize: '0.9rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'color 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = colors.accent}
                    onMouseLeave={e => e.currentTarget.style.color = colors.textSec}
                    >
                        <FaArrowLeft /> Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
