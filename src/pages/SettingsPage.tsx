import React, { useState } from 'react';
import { useTheme, BOARD_THEMES } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { validateNickname, MAX_NICKNAME_LENGTH } from '../utils/nicknameValidator';
import { FaEnvelope } from 'react-icons/fa';

export default function SettingsPage() {
    const { appTheme, setAppTheme, boardTheme, setBoardTheme, colors } = useTheme();
    const { currentUser, logout, deleteAccount } = useAuth()!;
    const { showToast, showConfirm } = useToast();
    const navigate = useNavigate();

    // Nickname state
    const [nickname, setNickname] = useState(currentUser?.nickname || '');
    const [saving, setSaving] = useState(false);

    async function handleUpdateNickname() {
        // XSS Protection: Validate and sanitize nickname
        const validation = validateNickname(nickname);
        if (!validation.isValid) {
            showToast(validation.errors[0], 'error');
            return;
        }
        
        const sanitizedNickname = validation.sanitized;
        setSaving(true);
        try {
            const firebase = (window as any).firebase;
            const db = firebase.database();
            
            // Update own profile with sanitized nickname
            await db.ref(`users/${currentUser!.uid}`).update({
                nickname: sanitizedNickname
            });
            
            // Also update nickname in all friends' cached friend lists
            const friendsSnap = await db.ref(`users/${currentUser!.uid}/friends`).once('value');
            const friendsData = friendsSnap.val();
            
            if (friendsData) {
                const updates: Record<string, any> = {};
                Object.keys(friendsData).forEach(friendUid => {
                    updates[`users/${friendUid}/friends/${currentUser!.uid}/nickname`] = sanitizedNickname;
                });
                
                if (Object.keys(updates).length > 0) {
                    await db.ref().update(updates);
                }
            }
            
            showToast("Nickname updated successfully!", 'success');
            setTimeout(() => window.location.reload(), 1000);
        } catch (e: any) {
            showToast("Error: " + e.message, 'error');
        }
        setSaving(false);
    }

    async function handleDeleteAccount() {
        const confirmed = await showConfirm("ARE YOU SURE? This will permanently delete your account and all data. This cannot be undone.");
        if (!confirmed) return;

        try {
            await deleteAccount();
            navigate('/');
            showToast("Account deleted successfully.", 'info');
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/requires-recent-login') {
                showToast("Security: Please Log Out and Log In again to delete your account.", 'error');
            } else {
                showToast("Error deleting account: " + err.message, 'error');
            }
        }
    }

    return (
        <div style={{ padding: '1.5rem 1rem', maxWidth: '800px', margin: '0 auto', color: colors.text }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '2rem', borderBottom: `1px solid ${colors.border}`, paddingBottom: '1rem' }}>Settings</h1>

            {/* Appearance Section */}
            <section style={{ marginBottom: '3rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>🎨</span> Appearance
                </h2>

                <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: colors.textSec }}>Application Theme</h3>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            onClick={() => setAppTheme('dark')}
                            style={{
                                flex: 1, padding: '1rem',
                                background: appTheme === 'dark' ? colors.accent : colors.card,
                                color: appTheme === 'dark' ? '#fff' : colors.text,
                                border: `2px solid ${appTheme === 'dark' ? colors.accent : colors.border}`,
                                borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
                            }}
                        >
                            🌙 Dark Mode
                        </button>
                        <button
                            onClick={() => setAppTheme('light')}
                            style={{
                                flex: 1, padding: '1rem',
                                background: appTheme === 'light' ? colors.accent : colors.card,
                                color: appTheme === 'light' ? '#fff' : colors.text,
                                border: `2px solid ${appTheme === 'light' ? colors.accent : colors.border}`,
                                borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
                            }}
                        >
                            ☀️ Light Mode
                        </button>
                    </div>
                </div>

                <div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: colors.textSec }}>Board Theme (Preview)</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem' }}>
                        {BOARD_THEMES.map(theme => (
                            <button
                                key={theme.id}
                                onClick={() => setBoardTheme(theme.id)}
                                style={{
                                    background: 'none',
                                    border: boardTheme.id === theme.id ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
                                    borderRadius: '8px',
                                    padding: '0.5rem',
                                    cursor: 'pointer',
                                    opacity: boardTheme.id === theme.id ? 1 : 0.7
                                }}
                            >
                                <div style={{
                                    width: '100%', aspectRatio: '1/1',
                                    display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr',
                                    borderRadius: '4px', overflow: 'hidden', marginBottom: '0.5rem',
                                    border: `2px solid ${theme.borderColor}`
                                }}>
                                    <div style={{ background: theme.lightSquare }}></div>
                                    <div style={{ background: theme.darkSquare }}></div>
                                    <div style={{ background: theme.darkSquare }}></div>
                                    <div style={{ background: theme.lightSquare }}></div>
                                </div>
                                <div style={{ textAlign: 'center', fontWeight: 500, color: colors.text, fontSize: '0.9rem' }}>{theme.name}</div>
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Account Section */}
            <section>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>👤</span> Account
                </h2>

                <div style={{ background: colors.card, padding: '1.5rem', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
                    {/* Nickname */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', color: colors.textSec, fontSize: '0.9rem', marginBottom: '0.4rem' }}>Nickname</label>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <input
                                type="text"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                style={{
                                    flex: 1, padding: '0.75rem',
                                    background: colors.bg, border: `1px solid ${colors.border}`,
                                    borderRadius: '6px', color: colors.text, fontSize: '1rem'
                                }}
                            />
                            <button
                                onClick={handleUpdateNickname}
                                disabled={saving}
                                style={{
                                    padding: '0.75rem 1.25rem',
                                    background: colors.accent, color: '#fff',
                                    border: 'none', borderRadius: '6px', cursor: 'pointer',
                                    fontWeight: 'bold', opacity: saving ? 0.7 : 1
                                }}
                            >
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>

                    {/* Email */}
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', color: colors.textSec, fontSize: '0.9rem', marginBottom: '0.4rem' }}>Email</label>
                        <div style={{ fontWeight: 500 }}>{currentUser?.email}</div>
                    </div>
                    
                    {/* Friend Code */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', color: colors.textSec, fontSize: '0.9rem', marginBottom: '0.4rem' }}>Friend Code</label>
                        <div style={{ fontFamily: 'monospace', background: colors.bg, padding: '0.5rem', borderRadius: '4px', display: 'inline-block' }}>
                            {currentUser?.friendCode}
                        </div>
                    </div>

                    {/* Change Password */}
                    <div style={{ marginBottom: '1.5rem', paddingTop: '1rem', borderTop: `1px solid ${colors.border}` }}>
                        <label style={{ display: 'block', color: colors.textSec, fontSize: '0.9rem', marginBottom: '0.75rem' }}>Change Password</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <input
                                type="password"
                                id="currentPassword"
                                placeholder="Current Password"
                                style={{
                                    padding: '0.75rem',
                                    background: colors.bg, border: `1px solid ${colors.border}`,
                                    borderRadius: '6px', color: colors.text, fontSize: '1rem'
                                }}
                            />
                            <input
                                type="password"
                                id="newPassword"
                                placeholder="New Password"
                                style={{
                                    padding: '0.75rem',
                                    background: colors.bg, border: `1px solid ${colors.border}`,
                                    borderRadius: '6px', color: colors.text, fontSize: '1rem'
                                }}
                            />
                            <input
                                type="password"
                                id="confirmNewPassword"
                                placeholder="Confirm New Password"
                                style={{
                                    padding: '0.75rem',
                                    background: colors.bg, border: `1px solid ${colors.border}`,
                                    borderRadius: '6px', color: colors.text, fontSize: '1rem'
                                }}
                            />
                            <button
                                onClick={async () => {
                                    const current = (document.getElementById('currentPassword') as HTMLInputElement).value;
                                    const newPass = (document.getElementById('newPassword') as HTMLInputElement).value;
                                    const confirm = (document.getElementById('confirmNewPassword') as HTMLInputElement).value;
                                    
                                    if (!current || !newPass || !confirm) {
                                        showToast('Please fill all password fields', 'error');
                                        return;
                                    }
                                    if (newPass !== confirm) {
                                        showToast('Passwords do not match', 'error');
                                        return;
                                    }
                                    if (newPass.length < 8) {
                                        showToast('Password must be at least 8 characters', 'error');
                                        return;
                                    }
                                    
                                    try {
                                        const firebase = (window as any).firebase;
                                        const user = firebase.auth().currentUser;
                                        const credential = firebase.auth.EmailAuthProvider.credential(user.email, current);
                                        await user.reauthenticateWithCredential(credential);
                                        await user.updatePassword(newPass);
                                        showToast('Password changed successfully!', 'success');
                                        (document.getElementById('currentPassword') as HTMLInputElement).value = '';
                                        (document.getElementById('newPassword') as HTMLInputElement).value = '';
                                        (document.getElementById('confirmNewPassword') as HTMLInputElement).value = '';
                                    } catch (err: any) {
                                        if (err.code === 'auth/wrong-password') {
                                            showToast('Current password is incorrect', 'error');
                                        } else {
                                            showToast('Error: ' + err.message, 'error');
                                        }
                                    }
                                }}
                                style={{
                                    padding: '0.75rem 1.25rem',
                                    background: colors.secondary, color: '#fff',
                                    border: 'none', borderRadius: '6px', cursor: 'pointer',
                                    fontWeight: 'bold', marginTop: '0.5rem'
                                }}
                            >
                                🔐 Change Password
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={handleDeleteAccount}
                        style={{ padding: '0.75rem 1.5rem', background: 'rgba(239, 68, 68, 0.1)', border: `1px solid ${colors.danger}`, color: colors.danger, borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'center', fontWeight: 'bold' }}
                    >
                        <span>🗑️</span> Delete Account
                    </button>
                </div>
            </section>
        </div>
    );
}
