import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { FaEnvelope, FaLock, FaArrowLeft } from 'react-icons/fa';

export default function VerifyEmail() {
    const { currentUser, sendAuthCode, verifyEmailCode } = useAuth()!;
    const { colors } = useTheme();
    const { showToast } = useToast();
    const navigate = useNavigate();

    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);

    useEffect(() => {
        if (!currentUser) {
            navigate('/login');
        } else if (currentUser.emailVerified) {
            navigate('/lobby');
        }
    }, [currentUser, navigate]);

    useEffect(() => {
        let timer: any;
        if (countdown > 0) {
            timer = setInterval(() => setCountdown(c => c - 1), 1000);
        }
        return () => clearInterval(timer);
    }, [countdown]);

    async function handleVerify(e: React.FormEvent) {
        e.preventDefault();
        if (code.length !== 6) return showToast("Please enter a 6-digit code", 'error');

        setLoading(true);
        try {
            await verifyEmailCode(currentUser!.email!, code);
            showToast("Email successfully verified!", 'success');
            navigate('/lobby');
        } catch (err: any) {
            showToast(err.message, 'error');
            // If code is invalidated (expired or too many attempts), enable resend immediately
            if (err.message.includes('expired') || err.message.includes('Too many') || err.message.includes('Invalid')) {
                setCountdown(0);
                setCode('');
            }
        } finally {
            setLoading(false);
        }
    }

    async function handleResend() {
        if (countdown > 0) return;
        
        setLoading(true);
        try {
            await sendAuthCode(currentUser!.email!, 'VERIFY');
            showToast("Verification code sent!", 'success');
            setCountdown(120); // 2 minutes - synced with OTP expiry
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: colors.bg,
            color: colors.text
        }}>
            <div style={{
                background: colors.card,
                padding: '2.5rem',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '420px',
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
                        <FaEnvelope />
                    </div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.5rem', color: colors.text }}>Verify Your Email</h2>
                    <p style={{ margin: 0, color: colors.textSec }}>
                        We sent a 6-digit code to <br/>
                        <span style={{ fontWeight: 'bold', color: colors.text }}>{currentUser?.email}</span>
                    </p>
                </div>

                <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    
                    <div style={{ position: 'relative' }}>
                        <FaLock style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: colors.textSec }} />
                        <input
                            type="text"
                        placeholder="000000"
                            maxLength={6}
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                            style={{
                                width: '100%',
                                padding: '1rem 1rem 1rem 3rem',
                                background: colors.bg,
                                border: `1px solid ${colors.border}`,
                                borderRadius: '12px',
                                color: colors.text,
                                fontSize: '1.1rem',
                                outline: 'none',
                                letterSpacing: '4px',
                                textAlign: 'center',
                                fontWeight: 'bold'
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || code.length !== 6}
                        style={{
                            padding: '1rem',
                            background: `linear-gradient(135deg, ${colors.accent}, ${colors.secondary})`,
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '1rem',
                            fontWeight: 600,
                            cursor: (loading || code.length !== 6) ? 'not-allowed' : 'pointer',
                            opacity: (loading || code.length !== 6) ? 0.7 : 1,
                            transition: 'all 0.2s',
                            boxShadow: `0 4px 12px ${colors.accent}40`
                        }}
                    >
                        {loading ? 'Verifying...' : 'Verify Email'}
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <button
                        type="button"
                        onClick={handleResend}
                        disabled={countdown > 0 || loading}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: countdown > 0 ? colors.textSec : colors.accent,
                            fontSize: '0.9rem',
                            cursor: countdown > 0 ? 'default' : 'pointer',
                            fontWeight: 500
                        }}
                    >
                        {countdown > 0 ? `Resend Code in ${countdown}s` : "Didn't receive code? Resend"}
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate('/lobby')} // Or logout
                        style={{
                            background: 'none',
                            border: 'none',
                            color: colors.textSec,
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <FaArrowLeft /> Return to Home
                    </button>
                </div>
            </div>
        </div>
    );
}
