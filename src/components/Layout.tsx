import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { validateNickname } from '../utils/nicknameValidator';
import { FaGamepad, FaUserFriends, FaCog, FaSignOutAlt, FaBook, FaUser, FaBell, FaClipboard, FaChessPawn, FaChess, FaBars, FaTimes, FaExclamationTriangle, FaCheck, FaEnvelope } from 'react-icons/fa';


// Helper Component for Individual Friend
const FriendItem = ({ uid, initialNickname, currentUserUid, onRemove, onInvite }: any) => {
    const { colors } = useTheme(); // NEW: Use Theme
    const { showToast } = useToast(); // NEW: Use Toast
    const [status, setStatus] = useState<'online' | 'offline' | 'playing'>('offline');
    const [roomCode, setRoomCode] = useState<string | null>(null);
    const [gameType, setGameType] = useState<'tamerlane' | 'classic'>('tamerlane');
    // Nickname usually doesn't change often, use initial or fetch once if needed. 
    // For scalability, we rely on the parent list's data for nickname.

    const [menuOpen, setMenuOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const firebase = (window as any).firebase;
        const userBaseRef = firebase.database().ref(`users/${uid}`);

        // OPTIMIZED: Listen to specific fields only to avoid downloading huge history/stats objects
        // This solves the bandwidth scaling issue (N+1 heavy payloads)

        const statusRef = userBaseRef.child('status');
        const roomRef = userBaseRef.child('currentRoomId');
        const typeRef = userBaseRef.child('currentGameType');

        const onStatus = (snap: any) => setStatus(snap.val() || 'offline');
        const onRoom = (snap: any) => setRoomCode(snap.val() || null);
        const onType = (snap: any) => setGameType(snap.val() || 'tamerlane');

        statusRef.on('value', onStatus);
        roomRef.on('value', onRoom);
        typeRef.on('value', onType);

        // Force refresh when tab becomes visible (mobile background issue)
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                // Re-fetch status once when tab becomes active
                statusRef.once('value', onStatus);
                roomRef.once('value', onRoom);
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            statusRef.off('value', onStatus);
            roomRef.off('value', onRoom);
            typeRef.off('value', onType);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [uid]);

    const handleSpectate = () => {
        if (roomCode) {
            // Navigate to correct game type
            const route = gameType === 'classic' ? `/game/classic/${roomCode}` : `/game/${roomCode}`;
            navigate(route);
        } else {
            showToast("No active game found for this user.", 'error');
        }
    };

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            marginBottom: '0.5rem', padding: '0.75rem', borderRadius: '8px',
            background: status !== 'offline' ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
            border: '1px solid transparent',
            position: 'relative'
        }}>
            <div style={{ position: 'relative' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: colors.card, border: `1px solid ${colors.border}`, color: colors.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem' }}>
                    {initialNickname.charAt(0).toUpperCase()}
                </div>
                <div style={{
                    width: '10px', height: '10px', borderRadius: '50%',
                    background: status === 'online' ? colors.success : (status === 'playing' ? colors.accent : colors.textSec),
                    position: 'absolute', bottom: 0, right: 0, border: `2px solid ${colors.card}`
                }}></div>
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ color: colors.text, fontWeight: 500, fontSize: '0.95rem' }}>{initialNickname}</div>
                <div style={{ color: colors.textSec, fontSize: '0.8rem' }}>
                    {status === 'online' ? 'Online' : (status === 'playing' ? 'In Game' : 'Offline')}
                </div>
            </div>

            {/* Menu Button */}
            <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                style={{ background: 'none', border: 'none', color: colors.textSec, cursor: 'pointer', padding: '4px', fontSize: '1.2rem' }}
            >
                ⋮
            </button>

            {/* Dropdown Menu */}
            {menuOpen && (
                <div style={{
                    position: 'absolute', right: '0.5rem', top: '100%', zIndex: 50,
                    background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)', minWidth: '160px', overflow: 'hidden'
                }} onMouseLeave={() => setMenuOpen(false)}>

                    {/* View Profile */}
                    <button
                        onClick={() => { navigate(`/profile/${uid}`); setMenuOpen(false); }}
                        style={{ width: '100%', padding: '0.75rem 1rem', background: 'none', border: 'none', color: colors.text, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: `1px solid ${colors.border}` }}
                        onMouseEnter={(e) => e.currentTarget.style.background = colors.bg}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    >
                        👤 View Profile
                    </button>

                    {/* Spectate Button - Only if Playing */}
                    {status === 'playing' && roomCode && (
                        <button
                            onClick={handleSpectate}
                            style={{ width: '100%', padding: '0.75rem 1rem', background: 'none', border: 'none', color: colors.accent, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: `1px solid ${colors.border}` }}
                            onMouseEnter={(e) => e.currentTarget.style.background = colors.bg}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                        >
                            👁️ Spectate
                        </button>
                    )}

                    {/* Invite Button - Disabled if Offline */}
                    <button
                        onClick={() => {
                            if (status === 'offline') {
                                showToast("User is offline.", 'error');
                                return;
                            }
                            onInvite(uid, initialNickname);
                            setMenuOpen(false);
                        }}
                        disabled={status === 'offline'}
                        style={{
                            width: '100%', padding: '0.75rem 1rem', background: 'none', border: 'none',
                            color: status === 'offline' ? colors.textSec : colors.success,
                            textAlign: 'left', cursor: status === 'offline' ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: '0.5rem'
                        }}
                        onMouseEnter={(e) => status !== 'offline' && (e.currentTarget.style.background = colors.bg)}
                        onMouseLeave={(e) => status !== 'offline' && (e.currentTarget.style.background = 'none')}
                    >
                        🎮 Invite to Game
                    </button>

                    <button
                        onClick={() => { onRemove(uid, initialNickname); setMenuOpen(false); }}
                        style={{ width: '100%', padding: '0.75rem 1rem', background: 'none', border: 'none', color: colors.danger, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = colors.bg}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    >
                        🗑️ Remove Friend
                    </button>
                </div>
            )}
        </div>
    );
};

export default function Layout({ children }: { children: React.ReactNode }) {
    const { logout, currentUser } = useAuth()!;
    const { colors, appTheme } = useTheme(); // Use Theme
    const { showToast, showConfirm } = useToast();
    const navigate = useNavigate();
    const [msg, setMsg] = useState('');
    const location = useLocation();
    const isLobby = location.pathname.includes('lobby');

    // Friends & Social State
    const [friends, setFriends] = useState<any[]>([]);
    const [friendRequests, setFriendRequests] = useState<any[]>([]);
    const [gameInvites, setGameInvites] = useState<any[]>([]);
    const [showSidebar, setShowSidebar] = useState(window.innerWidth > 900);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);
    // Social Modal State
    const [showSocialModal, setShowSocialModal] = useState(false);
    const [isSocialOpen, setIsSocialOpen] = useState(false);
    const [isPlayOpen, setIsPlayOpen] = useState(false); // Play submenu closed by default

    // Notification Count
    const notificationCount = friendRequests.length + gameInvites.length;

    // Removed separate navOpen state - using showSidebar for unified menu

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 900;
            setIsMobile(mobile);
            if (mobile && window.innerWidth < 800) setShowSidebar(false);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // UI State for Modals
    const [showFriendModal, setShowFriendModal] = useState(false);
    const [friendCodeInput, setFriendCodeInput] = useState('');
    const [friendError, setFriendError] = useState('');

    const [showSettings, setShowSettings] = useState(false);
    const [settingsTab, setSettingsTab] = useState<'profile' | 'security' | 'danger'>('profile');
    const [newNickname, setNewNickname] = useState(currentUser?.nickname || '');
    const [oldPass, setOldPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [settingsMsg, setSettingsMsg] = useState('');

    // Stats State
    const [stats, setStats] = useState<any>(null);
    const [matchHistory, setMatchHistory] = useState<any[]>([]);

    useEffect(() => {
        if (!showSettings || !currentUser) return;
        const firebase = (window as any).firebase;

        // Fetch Stats
        const statsRef = firebase.database().ref(`users/${currentUser.uid}/stats`);
        statsRef.on('value', (snap: any) => {
            setStats(snap.val() || { wins: 0, losses: 0, draws: 0, games: 0 });
        });

        // Fetch History
        const histRef = firebase.database().ref(`users/${currentUser.uid}/history`);
        histRef.orderByChild('timestamp').limitToLast(10).on('value', (snap: any) => {
            const data = snap.val();
            if (data) {
                const list = Object.values(data).sort((a: any, b: any) => b.timestamp - a.timestamp);
                setMatchHistory(list);
            }
        });

        return () => {
            statsRef.off();
            histRef.off();
        };
    }, [showSettings, currentUser]);

    // Friend Fetching Logic (List Only)
    useEffect(() => {
        if (!currentUser) return;
        const firebase = (window as any).firebase;
        const friendsRef = firebase.database().ref(`users/${currentUser.uid}/friends`);

        friendsRef.on('value', (snap: any) => {
            const data = snap.val();
            if (data) {
                // Just map to basic object, sorting handled locally or just by add time
                // We trust FriendItem to handle status updates
                const list = Object.keys(data).map(uid => ({
                    uid,
                    nickname: data[uid].nickname || 'Unknown'
                }));
                setFriends(list);
            } else {
                setFriends([]);
            }
        });

        return () => friendsRef.off();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    // Listen for incoming friend requests
    useEffect(() => {
        if (!currentUser) return;
        const firebase = (window as any).firebase;
        const requestsRef = firebase.database().ref(`users/${currentUser.uid}/friendRequests`);

        requestsRef.on('value', (snap: any) => {
            const data = snap.val();
            if (data) {
                // OPTIMIZED: Use stored nickname to avoid N+1 lookups
                const requests = Object.keys(data).map((fromUid) => {
                    return {
                        uid: fromUid,
                        nickname: data[fromUid].fromNickname || 'Unknown', // Use stored nickname
                        timestamp: data[fromUid].timestamp
                    };
                });
                setFriendRequests(requests);
            } else {
                setFriendRequests([]);
            }
        });

        return () => requestsRef.off();
    }, [currentUser]);

    // Listen for incoming game invites
    useEffect(() => {
        if (!currentUser) return;
        const firebase = (window as any).firebase;
        const invitesRef = firebase.database().ref(`users/${currentUser.uid}/gameInvites`);

        invitesRef.on('value', async (snap: any) => {
            const data = snap.val();
            if (data) {
                const invites = await Promise.all(Object.keys(data).map(async (inviteId) => {
                    const invite = data[inviteId];
                    return {
                        id: inviteId,
                        fromUid: invite.fromUid,
                        fromNickname: invite.fromNickname,
                        roomCode: invite.roomCode,
                        gameType: invite.gameType || 'tamerlane',
                        timestamp: invite.timestamp
                    };
                }));
                setGameInvites(invites);
            } else {
                setGameInvites([]);
            }
        });

        return () => invitesRef.off();
    }, [currentUser]);

    const isActive = (path: string) => location.pathname === path;

    async function handleLogout() {
        await logout();
        navigate('/login');
    }

    // --- Action Handlers ---

    async function handleAddFriend() {
        if (!friendCodeInput) return;
        setFriendError('');

        try {
            const code = friendCodeInput.toUpperCase().trim();
            if (code === currentUser?.friendCode) throw new Error("You cannot add yourself.");

            const firebase = (window as any).firebase;
            const usersRef = firebase.database().ref('users');
            const snapshot = await usersRef.orderByChild('friendCode').equalTo(code).once('value');

            if (!snapshot.exists()) {
                throw new Error("User not found with this code.");
            }

            let friendUid = '';
            let friendData: any = {};
            snapshot.forEach((child: any) => {
                friendUid = child.key;
                friendData = child.val();
            });

            // Check if already friends
            const existingFriend = friends.find(f => f.uid === friendUid);
            if (existingFriend) throw new Error("Already friends!");

            // Send a friend REQUEST instead of direct add
            await firebase.database().ref(`users/${friendUid}/friendRequests/${currentUser!.uid}`).set({
                fromUid: currentUser!.uid,
                fromNickname: currentUser!.nickname,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });

            setShowFriendModal(false);
            setFriendCodeInput('');
            setShowFriendModal(false);
            setFriendCodeInput('');
            showToast(`Friend request sent to ${friendData.nickname}!`, 'success');

        } catch (err: any) {
            setFriendError(err.message);
            showToast(err.message, 'error');
        }
    }

    // Accept friend request
    async function handleAcceptFriendRequest(fromUid: string, fromNickname: string) {
        try {
            const firebase = (window as any).firebase;
            // Add to both friend lists
            await firebase.database().ref(`users/${currentUser!.uid}/friends/${fromUid}`).set({
                nickname: fromNickname,
                addedAt: firebase.database.ServerValue.TIMESTAMP
            });
            await firebase.database().ref(`users/${fromUid}/friends/${currentUser!.uid}`).set({
                nickname: currentUser!.nickname,
                addedAt: firebase.database.ServerValue.TIMESTAMP
            });
            // Remove the request
            await firebase.database().ref(`users/${currentUser!.uid}/friendRequests/${fromUid}`).remove();
        } catch (err: any) {
            showToast('Error: ' + err.message, 'error');
        }
    }

    // Decline friend request
    async function handleDeclineFriendRequest(fromUid: string) {
        try {
            const firebase = (window as any).firebase;
            await firebase.database().ref(`users/${currentUser!.uid}/friendRequests/${fromUid}`).remove();
        } catch (err: any) {
            showToast('Error: ' + err.message, 'error');
        }
    }

    // Accept game invite
    async function handleAcceptGameInvite(inviteId: string, roomCode: string, gameType: string = 'tamerlane') {
        try {
            const firebase = (window as any).firebase;
            await firebase.database().ref(`users/${currentUser!.uid}/gameInvites/${inviteId}`).remove();
            const route = gameType === 'classic' ? `/game/classic/${roomCode}` : `/game/${roomCode}`;
            navigate(route);
        } catch (err: any) {
            showToast('Error: ' + err.message, 'error');
        }
    }

    // Decline game invite
    async function handleDeclineGameInvite(inviteId: string) {
        try {
            const firebase = (window as any).firebase;
            await firebase.database().ref(`users/${currentUser!.uid}/gameInvites/${inviteId}`).remove();
        } catch (err: any) {
            showToast('Error: ' + err.message, 'error');
        }
    }

    async function handleUpdateProfile() {
        // XSS Protection: Validate and sanitize nickname
        const validation = validateNickname(newNickname);
        if (!validation.isValid) {
            setSettingsMsg(validation.errors[0]);
            showToast(validation.errors[0], 'error');
            return;
        }
        
        const sanitizedNickname = validation.sanitized;
        
        try {
            const firebase = (window as any).firebase;
            const db = firebase.database();
            
            // Update own profile with sanitized nickname
            await db.ref(`users/${currentUser!.uid}`).update({
                nickname: sanitizedNickname
            });
            
            // Also update nickname in all friends' cached friend lists
            // This ensures others see the updated nickname immediately
            const friendsSnap = await db.ref(`users/${currentUser!.uid}/friends`).once('value');
            const friendsData = friendsSnap.val();
            
            if (friendsData) {
                const updates: Record<string, any> = {};
                Object.keys(friendsData).forEach(friendUid => {
                    // Update my nickname in each friend's friend list
                    updates[`users/${friendUid}/friends/${currentUser!.uid}/nickname`] = sanitizedNickname;
                });
                
                if (Object.keys(updates).length > 0) {
                    await db.ref().update(updates);
                }
            }
            
            setSettingsMsg("Nickname updated! Refreshing...");
            showToast("Nickname updated! Refreshing...", 'success');
            setTimeout(() => window.location.reload(), 1000);
        } catch (e: any) {
            setSettingsMsg("Error: " + e.message);
            showToast("Error: " + e.message, 'error');
        }
    }

    async function handleChangePassword() {
        try {
            const firebase = (window as any).firebase;
            const user = firebase.auth().currentUser;
            const cred = firebase.auth.EmailAuthProvider.credential(user.email, oldPass);
            await user.reauthenticateWithCredential(cred);
            await user.updatePassword(newPass);
            setSettingsMsg("Password changed successfully!");
            showToast("Password changed successfully!", 'success');
            setOldPass('');
            setNewPass('');
        } catch (e: any) {
            setSettingsMsg("Error: " + e.message);
            showToast("Error: " + e.message, 'error');
        }
    }

    async function handleDeleteAccount() {
        const confirmed = await showConfirm("Are you sure? This cannot be undone.");
        if (!confirmed) return;
        try {
            const firebase = (window as any).firebase;
            const user = firebase.auth().currentUser;
            await firebase.database().ref(`users/${user.uid}`).remove();
            await user.delete();
            navigate('/');
            showToast("Account deleted.", 'info');
        } catch (e: any) {
            setSettingsMsg("Error: " + e.message);
            showToast("Error: " + e.message, 'error');
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: colors.bg, color: colors.text }}>

            <header style={{
                height: '60px',
                background: colors.sidebar,
                borderBottom: `1px solid ${colors.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 1rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                zIndex: 50,
                position: 'relative'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {/* Mobile Hamburger (Toggles Unified Sidebar) */}
                    {isMobile && (
                        <button
                            onClick={() => setShowSidebar(!showSidebar)}
                            style={{ background: 'none', border: 'none', color: colors.text, fontSize: '1.5rem', cursor: 'pointer', position: 'relative' }}
                        >
                            <FaBars />
                            {!showSidebar && notificationCount > 0 && (
                                <span style={{
                                    position: 'absolute', top: -5, right: -5,
                                    background: colors.danger, color: 'white',
                                    fontSize: '0.65rem', padding: '2px 5px', borderRadius: '50%',
                                    fontWeight: 'bold', border: `2px solid ${colors.bg}`,
                                    minWidth: '16px', textAlign: 'center'
                                }}>
                                    {notificationCount}
                                </span>
                            )}
                        </button>
                    )}

                    <Link to="/lobby" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.8rem' }}>♟</span>
                        {!isMobile && <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: colors.text, lineHeight: '1' }}>Tamerlane Chess</span>}
                    </Link>

                    {/* Desktop Nav */}
                    {!isMobile && (
                        <nav style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                            {[
                                { path: '/docs', icon: <FaBook />, label: 'Guide' },
                                { path: '/local-game', icon: <FaUserFriends />, label: 'Local' },
                                { path: '/lobby', icon: <FaGamepad />, label: 'Tamerlane' },
                                { path: '/classic-lobby', icon: <FaChessPawn />, label: 'Classic' },
                                { path: '/profile', icon: <FaUser />, label: 'Profile' }
                            ].map(link => (
                                <Link key={link.path} to={link.path} style={{
                                    textDecoration: 'none',
                                    color: isActive(link.path) ? colors.accent : colors.textSec,
                                    fontWeight: 500,
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: '6px',
                                    background: isActive(link.path) ? `${colors.accent}20` : 'transparent',
                                    fontSize: '0.9rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}>
                                    <span style={{ fontSize: '1.1rem' }}>{link.icon}</span>
                                    {link.label}
                                </Link>
                            ))}
                        </nav>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {/* Desktop Chat Toggle with Badge */}
                    {!isMobile && (
                        <button
                            onClick={() => setShowSidebar(!showSidebar)}
                            title={showSidebar ? "Close Sidebar" : "Open Social Bar"}
                            style={{ background: 'none', border: 'none', color: colors.text, fontSize: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', position: 'relative' }}
                        >
                            {showSidebar ? <FaTimes /> : <FaBars />}
                            {!showSidebar && notificationCount > 0 && (
                                <span style={{
                                    position: 'absolute', top: -5, right: -5,
                                    background: colors.danger, color: 'white',
                                    fontSize: '0.7rem', padding: '2px 5px', borderRadius: '50%',
                                    fontWeight: 'bold', border: `2px solid ${colors.bg}`
                                }}>
                                    {notificationCount}
                                </span>
                            )}
                        </button>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: colors.accent, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                            {currentUser?.nickname?.charAt(0).toUpperCase()}
                        </div>
                        {!isMobile && <span style={{ color: colors.text, fontWeight: 500 }}>{currentUser?.nickname}</span>}
                    </div>
                </div>
            </header>

            {/* Main Body */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>

                {/* Scrollable Content */}
                <main style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '0.5rem' : '2rem', background: 'transparent', display: 'flex', flexDirection: 'column' }}>


                    <div style={{ flex: 1, paddingBottom: isLobby || isMobile ? '4rem' : '1rem' }}>
                        {children}
                    </div>



                </main>

                {/* Unified Sidebar (Right on Desktop, Left functionality on Mobile) */}
                <aside style={{
                    width: showSidebar ? '300px' : '0px',
                    opacity: showSidebar ? 1 : 0,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    background: colors.sidebar,
                    borderLeft: (!isMobile && showSidebar) ? `1px solid ${colors.border}` : 'none',
                    borderRight: (isMobile && showSidebar) ? `1px solid ${colors.border}` : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 40,
                    // Mobile Overlay Logic
                    position: isMobile ? 'fixed' : 'relative',
                    left: isMobile ? 0 : 'auto', // Mobile: Left side
                    right: isMobile ? 'auto' : 0, // Desktop: Right side
                    top: isMobile ? '60px' : 'auto',
                    bottom: isMobile ? 0 : 'auto',
                    boxShadow: (isMobile && showSidebar) ? '5px 0 15px rgba(0,0,0,0.5)' : 'none'
                }} >

                    {/* Mobile Navigation Links inside Sidebar */}
                    {isMobile && (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            height: '100%',
                            background: 'transparent'
                        }}>
                            {/* Main Navigation */}
                            <div style={{
                                padding: '1rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.25rem',
                                flex: 1,
                                overflowY: 'auto'
                            }}>
                                {/* Play Section with Submenu */}
                                <div>
                                    <button
                                        onClick={() => setIsPlayOpen(!isPlayOpen)}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: colors.text,
                                            display: 'flex', flexDirection: 'row', alignItems: 'center',
                                            gap: '1rem', fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
                                            padding: '0.75rem', borderRadius: '8px', width: '100%', textAlign: 'left'
                                        }}
                                    >
                                        <FaGamepad style={{ fontSize: '1.2rem' }} />
                                        <span>Play</span>
                                        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: colors.textSec }}>
                                            {isPlayOpen ? '▲' : '▼'}
                                        </span>
                                    </button>
                                    {isPlayOpen && (
                                        <div style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                            <Link to="/lobby" onClick={() => setShowSidebar(false)} style={{
                                                textDecoration: 'none',
                                                color: isActive('/lobby') ? colors.accent : colors.textSec,
                                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                                padding: '0.6rem 0.75rem', borderRadius: '6px',
                                                background: isActive('/lobby') ? `${colors.accent}15` : 'transparent',
                                                fontSize: '0.95rem'
                                            }}>
                                                <FaChess style={{ fontSize: '1rem' }} />
                                                <span>Tamerlane Chess</span>
                                            </Link>
                                            <Link to="/classic-lobby" onClick={() => setShowSidebar(false)} style={{
                                                textDecoration: 'none',
                                                color: isActive('/classic-lobby') ? colors.accent : colors.textSec,
                                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                                padding: '0.6rem 0.75rem', borderRadius: '6px',
                                                background: isActive('/classic-lobby') ? `${colors.accent}15` : 'transparent',
                                                fontSize: '0.95rem'
                                            }}>
                                                <FaChessPawn style={{ fontSize: '1rem' }} />
                                                <span>Classic Chess</span>
                                            </Link>
                                            <Link to="/local-game" onClick={() => setShowSidebar(false)} style={{
                                                textDecoration: 'none',
                                                color: isActive('/local-game') ? colors.accent : colors.textSec,
                                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                                padding: '0.6rem 0.75rem', borderRadius: '6px',
                                                background: isActive('/local-game') ? `${colors.accent}15` : 'transparent',
                                                fontSize: '0.95rem'
                                            }}>
                                                <FaUserFriends style={{ fontSize: '1rem' }} />
                                                <span>Local Game</span>
                                            </Link>
                                        </div>
                                    )}
                                </div>

                                {/* Other Links */}
                                {[
                                    { path: '/docs', icon: <FaBook />, label: 'Documentation' },
                                    { path: '/profile', icon: <FaUser />, label: 'Profile' }
                                ].map(link => (
                                    <Link key={link.path} to={link.path} onClick={() => setShowSidebar(false)} style={{
                                        textDecoration: 'none',
                                        color: isActive(link.path) ? colors.accent : colors.textSec,
                                        display: 'flex', alignItems: 'center', gap: '1rem',
                                        padding: '0.75rem', borderRadius: '8px',
                                        background: isActive(link.path) ? `${colors.accent}15` : 'transparent',
                                        fontSize: '1rem', fontWeight: 500
                                    }}>
                                        <span style={{ fontSize: '1.2rem' }}>{link.icon}</span>
                                        <span>{link.label}</span>
                                    </Link>
                                ))}

                                {/* Social Button */}
                                <button
                                    onClick={() => setIsSocialOpen(!isSocialOpen)}
                                    style={{
                                        background: isSocialOpen ? `${colors.accent}15` : 'transparent',
                                        border: 'none',
                                        color: isSocialOpen ? colors.accent : colors.textSec,
                                        display: 'flex', alignItems: 'center',
                                        gap: '1rem', fontSize: '1rem', fontWeight: 500, cursor: 'pointer',
                                        padding: '0.75rem', borderRadius: '8px', width: '100%', textAlign: 'left'
                                    }}
                                >
                                    <FaBell style={{ fontSize: '1.2rem' }} />
                                    <span>Social</span>
                                    {notificationCount > 0 && (
                                        <span style={{
                                            marginLeft: 'auto',
                                            background: colors.danger, color: 'white',
                                            fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold'
                                        }}>
                                            {notificationCount}
                                        </span>
                                    )}
                                </button>

                                {isSocialOpen && (
                                    <div style={{ paddingLeft: '0.5rem', paddingTop: '0.5rem', borderTop: `1px solid ${colors.border}`, marginTop: '0.25rem' }}>
                                        {/* Friend Code */}
                                        <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px' }}>
                                            <code style={{ fontSize: '0.9rem', color: colors.text, fontWeight: 'bold' }}>{currentUser?.friendCode}</code>
                                            <button onClick={() => navigator.clipboard.writeText(currentUser?.friendCode || '')} style={{ background: 'none', border: 'none', color: colors.textSec, cursor: 'pointer' }}><FaClipboard /></button>
                                        </div>

                                        {/* Add Friend */}
                                        <button onClick={() => setShowFriendModal(true)} style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', background: colors.accent, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>+ Add Friend</button>

                                        {/* Incoming */}
                                        {(friendRequests.length > 0 || gameInvites.length > 0) && (
                                            <div style={{ marginBottom: '1rem' }}>
                                                <div style={{ fontSize: '0.7rem', color: '#f59e0b', marginBottom: '0.5rem', fontWeight: 'bold' }}>INCOMING</div>
                                                {friendRequests.map(req => (
                                                    <div key={req.uid} style={{ marginBottom: '0.5rem', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        <span style={{ fontSize: '0.8rem' }}>{req.nickname}</span>
                                                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                            <button onClick={() => handleAcceptFriendRequest(req.uid, req.nickname)} style={{ background: colors.success, border: 'none', borderRadius: '2px', color: 'white', fontSize: '0.7rem', padding: '2px 6px' }}>✓</button>
                                                            <button onClick={() => handleDeclineFriendRequest(req.uid)} style={{ background: colors.danger, border: 'none', borderRadius: '2px', color: 'white', fontSize: '0.7rem', padding: '2px 6px' }}>✕</button>
                                                        </div>
                                                    </div>
                                                ))}
                                                {gameInvites.map(invite => (
                                                    <div key={invite.id} style={{ marginBottom: '0.5rem', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        <span style={{ fontSize: '0.8rem' }}>🎮 {invite.fromNickname}</span>
                                                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                            <button onClick={() => handleAcceptGameInvite(invite.id, invite.roomCode, invite.gameType)} style={{ background: colors.success, border: 'none', borderRadius: '2px', color: 'white', fontSize: '0.7rem', padding: '2px 6px' }}>✓</button>
                                                            <button onClick={() => handleDeclineGameInvite(invite.id)} style={{ background: colors.danger, border: 'none', borderRadius: '2px', color: 'white', fontSize: '0.7rem', padding: '2px 6px' }}>✕</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Friends */}
                                        <div style={{ fontSize: '0.7rem', color: colors.textSec, marginBottom: '0.5rem', fontWeight: 'bold' }}>FRIENDS</div>
                                        {friends.length === 0 && <div style={{ fontSize: '0.8rem', color: colors.textSec, fontStyle: 'italic' }}>No friends yet.</div>}
                                        {friends.map(friend => (
                                            <FriendItem key={friend.uid} uid={friend.uid} initialNickname={friend.nickname} currentUserUid={currentUser!.uid}
                                                onRemove={async (uid: string, name: string) => {
                                                    const confirmed = await showConfirm(`Remove ${name} from friends?`);
                                                    if (!confirmed) return;
                                                    const firebase = (window as any).firebase;
                                                    await firebase.database().ref(`users/${currentUser!.uid}/friends/${uid}`).remove();
                                                    await firebase.database().ref(`users/${uid}/friends/${currentUser!.uid}`).remove();
                                                    setFriends(prev => prev.filter(f => f.uid !== uid));
                                                }}
                                                onInvite={async (uid: string, name: string) => {
                                                     const firebase = (window as any).firebase;
                                                     const mySnap = await firebase.database().ref(`users/${currentUser!.uid}`).once('value');
                                                     const myVal = mySnap.val();
                                                     const myRoomId = myVal?.currentRoomId;
                                                     if (!myRoomId) { showToast("Create a room first!", 'info'); return; }
                                                     // Use set with fromUid as key to prevent duplicate invites
                                                     await firebase.database().ref(`users/${uid}/gameInvites/${currentUser!.uid}`).set({
                                                          fromUid: currentUser!.uid,
                                                          fromNickname: currentUser!.nickname,
                                                          roomCode: myRoomId,
                                                          gameType: myVal?.currentGameType || 'tamerlane',
                                                          timestamp: firebase.database.ServerValue.TIMESTAMP
                                                      });
                                                      showToast(`Invite sent to ${name}!`, 'success');
                                                }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Bottom Fixed Section - Settings & Logout */}
                            <div style={{
                                borderTop: `1px solid ${colors.border}`,
                                padding: '0.75rem 1rem',
                                background: colors.card
                            }}>
                                <Link
                                    to="/settings"
                                    onClick={() => setShowSidebar(false)}
                                    style={{
                                        textDecoration: 'none',
                                        color: colors.textSec,
                                        display: 'flex', alignItems: 'center', gap: '1rem',
                                        padding: '0.6rem', borderRadius: '6px',
                                        fontSize: '0.95rem', fontWeight: 500
                                    }}
                                >
                                    <FaCog style={{ fontSize: '1.1rem' }} />
                                    <span>Settings</span>
                                </Link>
                                <button
                                    onClick={() => { setShowSidebar(false); handleLogout(); }}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: colors.danger,
                                        display: 'flex', alignItems: 'center', gap: '1rem',
                                        padding: '0.6rem', borderRadius: '6px',
                                        fontSize: '0.95rem', fontWeight: 500, cursor: 'pointer',
                                        width: '100%', textAlign: 'left'
                                    }}
                                >
                                    <FaSignOutAlt style={{ fontSize: '1.1rem' }} />
                                    <span>Logout</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Desktop Sidebar Content (Always Visible if showSidebar is true) */}
                    {!isMobile && (
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'hidden' }}>
                             {/* Friend Code Section */}
                            <div style={{ padding: '1.5rem 1rem', background: colors.card, borderBottom: `1px solid ${colors.border}` }}>
                                <div style={{ fontSize: '0.85rem', color: colors.textSec, marginBottom: '0.25rem' }}>YOUR FRIEND CODE</div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <code style={{ fontSize: '1.2rem', color: colors.text, fontWeight: 'bold', letterSpacing: '1px' }}>
                                        {currentUser?.friendCode}
                                    </code>
                                    <button
                                        onClick={() => { navigator.clipboard.writeText(currentUser?.friendCode || '') }}
                                        title="Copy"
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', opacity: 0.7 }}
                                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                                    >
                                        <FaClipboard style={{ fontSize: '1.2rem' }} />
                                    </button>
                                </div>
                            </div>

                            {/* Header & Add Friend */}
                            <div style={{ padding: '1rem', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '1rem', color: colors.text }}>Social</h3>
                                <button
                                    onClick={() => setShowFriendModal(true)}
                                    style={{
                                        background: colors.accent, color: 'white', border: 'none',
                                        padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold'
                                    }}>
                                    + Add Friend
                                </button>
                            </div>

                            {/* Friend List */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                                {(friendRequests.length > 0 || gameInvites.length > 0) && (
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#eab308', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <FaBell /> Incoming ({friendRequests.length + gameInvites.length})
                                        </h4>
                                        {/* Friend Requests */}
                                        {friendRequests.map(req => (
                                            <div key={req.uid} style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.5rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                    <span style={{ fontSize: '1rem' }}>👤</span>
                                                    <span style={{ color: '#fff', fontWeight: 500 }}>{req.nickname}</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button onClick={() => handleAcceptFriendRequest(req.uid, req.nickname)} style={{ flex: 1, padding: '0.4rem', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>✓ Accept</button>
                                                    <button onClick={() => handleDeclineFriendRequest(req.uid)} style={{ flex: 1, padding: '0.4rem', background: '#333', color: '#aaa', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>✕ Decline</button>
                                                </div>
                                            </div>
                                        ))}
                                        {/* Game Invites */}
                                        {gameInvites.map(invite => (
                                            <div key={invite.id} style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.5rem' }}>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                    <span style={{ fontSize: '1rem' }}>{invite.gameType === 'classic' ? '♟️' : '🎮'}</span>
                                                    <span style={{ color: '#fff', fontWeight: 500 }}>{invite.fromNickname}</span>
                                                    <span style={{ color: '#60a5fa', fontSize: '0.8rem', fontWeight: 'bold' }}>{invite.gameType === 'classic' ? 'Classic Chess' : 'Tamerlane Chess'}</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button onClick={() => handleAcceptGameInvite(invite.id, invite.roomCode, invite.gameType)} style={{ flex: 1, padding: '0.4rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>✓ Join</button>
                                                    <button onClick={() => handleDeclineGameInvite(invite.id)} style={{ flex: 1, padding: '0.4rem', background: '#333', color: '#aaa', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>✕ Decline</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#666', marginBottom: '0.5rem' }}>Friends</h4>
                                {friends.length === 0 && <p style={{ fontSize: '0.9rem', color: '#555', fontStyle: 'italic', textAlign: 'center', marginTop: '1rem' }}>No friends yet.<br />Share your code!</p>}
                                {friends.map(friend => (
                                    <FriendItem key={friend.uid} uid={friend.uid} initialNickname={friend.nickname} currentUserUid={currentUser!.uid} 
                                        onRemove={async (uid: string, name: string) => {
                                            const confirmed = await showConfirm(`Remove ${name} from friends?`);
                                            if (!confirmed) return;
                                            const firebase = (window as any).firebase;
                                            await firebase.database().ref(`users/${currentUser!.uid}/friends/${uid}`).remove();
                                            await firebase.database().ref(`users/${uid}/friends/${currentUser!.uid}`).remove();
                                        }} 
                                        onInvite={async (uid: string, name: string) => {
                                             const firebase = (window as any).firebase;
                                             const mySnap = await firebase.database().ref(`users/${currentUser!.uid}`).once('value');
                                             const myVal = mySnap.val();
                                             const myRoomId = myVal?.currentRoomId;
                                             if (!myRoomId) { showToast("Create a room first!", 'info'); return; }
                                             // Use set with fromUid as key to prevent duplicate invites
                                             await firebase.database().ref(`users/${uid}/gameInvites/${currentUser!.uid}`).set({
                                                   fromUid: currentUser!.uid,
                                                   fromNickname: currentUser!.nickname,
                                                   roomCode: myRoomId,
                                                   gameType: myVal?.currentGameType || 'tamerlane',
                                                   timestamp: firebase.database.ServerValue.TIMESTAMP
                                               });
                                               showToast(`Invite sent to ${name}!`, 'success');
                                        }} 
                                    />
                                ))}
                            </div>

                             {/* Footer Actions */}
                            <div style={{ padding: '1rem', borderTop: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <button onClick={() => navigate('/settings')} style={{ width: '100%', padding: '0.75rem', background: colors.card, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '6px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span><FaCog /></span> Settings
                                </button>
                                <button onClick={handleLogout} style={{ width: '100%', padding: '0.75rem', background: 'transparent', color: colors.danger, border: `1px solid ${colors.danger}`, borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>
                                    Log Out
                                </button>
                            </div>
                        </div>
                    )}

            </aside>

            </div>

            {/* SOCIAL MODAL (Mobile Only) */}
            {isMobile && showSocialModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.8)', zIndex: 60, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end'
                }}>
                    <div style={{
                        background: colors.bg, borderTopLeftRadius: '16px', borderTopRightRadius: '16px',
                        height: '85%', width: '100%', padding: '1rem', display: 'flex', flexDirection: 'column',
                        borderTop: `1px solid ${colors.border}`, boxShadow: '0 -4px 20px rgba(0,0,0,0.5)'
                    }}>
                        {/* Modal Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: `1px solid ${colors.border}` }}>
                            <h2 style={{ margin: 0, fontSize: '1.2rem', color: colors.text }}>Social Hub</h2>
                            <button onClick={() => setShowSocialModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: colors.textSec, cursor: 'pointer' }}><FaTimes /></button>
                        </div>

                        {/* Modal Content - Reusing Logic */}
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                             {/* Friend Code Section */}
                            <div style={{ padding: '1.5rem 1rem', background: colors.card, borderBottom: `1px solid ${colors.border}` }}>
                                <div style={{ fontSize: '0.85rem', color: colors.textSec, marginBottom: '0.25rem' }}>YOUR FRIEND CODE</div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <code style={{ fontSize: '1.2rem', color: colors.text, fontWeight: 'bold', letterSpacing: '1px' }}>
                                        {currentUser?.friendCode}
                                    </code>
                                    <button
                                        onClick={() => { navigator.clipboard.writeText(currentUser?.friendCode || '') }}
                                        title="Copy"
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', opacity: 0.7 }}
                                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                                    >
                                        <FaClipboard style={{ fontSize: '1.2rem' }} />
                                    </button>
                                </div>
                            </div>

                            {/* Header & Add Friend */}
                            <div style={{ padding: '1rem', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '1rem', color: colors.text }}>Social</h3>
                                <button
                                    onClick={() => setShowFriendModal(true)}
                                    style={{
                                        background: colors.accent, color: 'white', border: 'none',
                                        padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold'
                                    }}>
                                    + Add Friend
                                </button>
                            </div>

                            {/* Friend List */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                                {(friendRequests.length > 0 || gameInvites.length > 0) && (
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#eab308', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <FaBell /> Incoming ({friendRequests.length + gameInvites.length})
                                        </h4>
                                        {/* Friend Requests */}
                                        {friendRequests.map(req => (
                                            <div key={req.uid} style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.5rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                    <span style={{ fontSize: '1rem' }}>👤</span>
                                                    <span style={{ color: '#fff', fontWeight: 500 }}>{req.nickname}</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button onClick={() => handleAcceptFriendRequest(req.uid, req.nickname)} style={{ flex: 1, padding: '0.4rem', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>✓ Accept</button>
                                                    <button onClick={() => handleDeclineFriendRequest(req.uid)} style={{ flex: 1, padding: '0.4rem', background: '#333', color: '#aaa', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>✕ Decline</button>
                                                </div>
                                            </div>
                                        ))}
                                        {/* Game Invites */}
                                        {gameInvites.map(invite => (
                                            <div key={invite.id} style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.5rem' }}>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                    <span style={{ fontSize: '1rem' }}>{invite.gameType === 'classic' ? '♟️' : '🎮'}</span>
                                                    <span style={{ color: '#fff', fontWeight: 500 }}>{invite.fromNickname}</span>
                                                    <span style={{ color: '#60a5fa', fontSize: '0.8rem', fontWeight: 'bold' }}>{invite.gameType === 'classic' ? 'Classic Chess' : 'Tamerlane Chess'}</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button onClick={() => handleAcceptGameInvite(invite.id, invite.roomCode, invite.gameType)} style={{ flex: 1, padding: '0.4rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>✓ Join</button>
                                                    <button onClick={() => handleDeclineGameInvite(invite.id)} style={{ flex: 1, padding: '0.4rem', background: '#333', color: '#aaa', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>✕ Decline</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#666', marginBottom: '0.5rem' }}>Friends</h4>
                                {friends.length === 0 && <p style={{ fontSize: '0.9rem', color: '#555', fontStyle: 'italic', textAlign: 'center', marginTop: '1rem' }}>No friends yet.<br />Share your code!</p>}
                                {friends.map(friend => (
                                    <FriendItem key={friend.uid} uid={friend.uid} initialNickname={friend.nickname} currentUserUid={currentUser!.uid} 
                                        onRemove={async (uid: string, name: string) => {
                                            const confirmed = await showConfirm(`Remove ${name} from friends?`);
                                            if (!confirmed) return;
                                            const firebase = (window as any).firebase;
                                            await firebase.database().ref(`users/${currentUser!.uid}/friends/${uid}`).remove();
                                            await firebase.database().ref(`users/${uid}/friends/${currentUser!.uid}`).remove();
                                        }} 
                                        onInvite={async (uid: string, name: string) => {
                                             const firebase = (window as any).firebase;
                                             const mySnap = await firebase.database().ref(`users/${currentUser!.uid}`).once('value');
                                             const myVal = mySnap.val();
                                             const myRoomId = myVal?.currentRoomId;
                                             if (!myRoomId) { showToast("Create a room first!", 'info'); return; }
                                              await firebase.database().ref(`users/${uid}/gameInvites`).push({
                                                   fromUid: currentUser!.uid,
                                                   fromNickname: currentUser!.nickname,
                                                   roomCode: myRoomId,
                                                   gameType: myVal?.currentGameType || 'tamerlane',
                                                   timestamp: firebase.database.ServerValue.TIMESTAMP
                                               });
                                               showToast(`Invite sent to ${name}!`, 'success');
                                        }} 
                                    />
                                ))}

                        </div>
                    </div>
                </div>
            </div>
            )}

            {/* --- MODALS --- */}

            {/* Friend Add Modal */}
            {showFriendModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div style={{ background: colors.card, padding: '2rem', borderRadius: '8px', width: '90%', maxWidth: '400px', boxShadow: '0 4px 10px rgba(0,0,0,0.5)', border: `1px solid ${colors.border}` }}>
                        <h3 style={{ marginBottom: '1rem', color: colors.text }}>Add Friend</h3>
                        <p style={{ color: colors.textSec, marginBottom: '1rem', fontSize: '0.9rem' }}>Enter your friend's 6-character code.</p>
                        <input
                            type="text"
                            placeholder="FRIEND CODE"
                            value={friendCodeInput}
                            onChange={(e) => setFriendCodeInput(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '4px', marginBottom: '1rem', textTransform: 'uppercase', color: colors.text, fontSize: '1.2rem', letterSpacing: '2px', textAlign: 'center' }}
                        />
                        {friendError && <div style={{ color: colors.danger, marginBottom: '1rem', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '4px' }}>{friendError}</div>}
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button onClick={() => { setShowFriendModal(false); setFriendError(''); }} style={{ flex: 1, padding: '0.75rem', background: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                            <button onClick={handleAddFriend} style={{ flex: 1, padding: '0.75rem', background: colors.accent, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Add Friend</button>
                        </div>
                    </div>
                </div>
            )}


        </div>
    );
}
