import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { firebaseConfig } from '../firebaseConfig';

const initFirebase = (firebase: any) => {
    if (!firebase) throw new Error("Firebase SDK not loaded");
    if (firebase.apps.length === 0) {
        try {
            firebase.initializeApp(firebaseConfig);
        } catch (e) {
            // Silent fail - already initialized
        }
    }
    return firebase;
};

// Define user type
interface User {
    uid: string;
    email: string | null;
    emailVerified: boolean;
    nickname?: string;
    friendCode?: string;
}

interface AuthContextType {
    currentUser: User | null;
    signup: (email: string, pass: string, nickname: string) => Promise<void>;
    login: (email: string, pass: string) => Promise<void>;
    logout: () => Promise<void>;
    sendAuthCode: (email: string, type: 'VERIFY' | 'RESET') => Promise<void>;
    verifyEmailCode: (email: string, code: string) => Promise<void>;
    resetPasswordWithCode: (email: string, code: string, newPass: string) => Promise<void>;
    deleteAccount: () => Promise<void>;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
    return useContext(AuthContext);
}

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const getFirebase = () => {
        const w = window as any;
        if (!w.firebase) throw new Error("Firebase SDK not loaded yet");
        return initFirebase(w.firebase);
    };

    const getAuth = () => getFirebase().auth();
    const getDb = () => getFirebase().database();

    function generateFriendCode() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    async function signup(email: string, pass: string, nickname: string) {
        const userCred = await getAuth().createUserWithEmailAndPassword(email, pass);
        const user = userCred.user;

        if (user) {
            const code = generateFriendCode();
            await getDb().ref('users/' + user.uid).set({
                email: user.email,
                nickname: nickname,
                friendCode: code,
                createdAt: getFirebase().database.ServerValue.TIMESTAMP
            });

            setCurrentUser({
                uid: user.uid,
                email: user.email,
                emailVerified: user.emailVerified,
                nickname: nickname,
                friendCode: code
            });
            
            // Send verification email automatically on signup
            try {
                // We use 'VERIFY' type for initial email verification
                await sendAuthCode(user.email!, 'VERIFY');
            } catch (error) {
                console.error("Failed to auto-send verification email", error);
                // Don't block signup, user can resend from UI
            }
        }
    }

    function login(email: string, pass: string) {
        return getAuth().signInWithEmailAndPassword(email, pass);
    }

    async function logout() {
        const firebase = getFirebase();
        const user = getAuth().currentUser;
        if (user) {
            await firebase.database().ref(`users/${user.uid}/status`).set('offline');
        }
        return getAuth().signOut();
    }

    async function deleteAccount() {
        const user = getAuth().currentUser;
        if (!user) throw new Error("No user logged in");

        // Delete user data from DB
        await getDb().ref('users/' + user.uid).remove();
        
        // Delete user auth account
        await user.delete();
    }

    // --- OTP API CALLS ---

    async function sendAuthCode(email: string, type: 'VERIFY' | 'RESET') {
        const response = await fetch('/api/auth/send-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, type })
        });
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to send code');
        }
    }

    async function verifyEmailCode(email: string, code: string) {
        const response = await fetch('/api/auth/verify-email-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code })
        });
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to verify email');
        }
        // Force refresh user token to update emailVerified status
        // Force refresh user token to update emailVerified status
        const user = getAuth().currentUser;
        if (user) {
            await user.reload();
            // Force update local state
            const updatedUser = getAuth().currentUser;
            if (updatedUser) {
                setCurrentUser(prev => prev ? { ...prev, emailVerified: updatedUser.emailVerified } : null);
            }
        }
    }

    async function resetPasswordWithCode(email: string, code: string, newPass: string) {
        const response = await fetch('/api/auth/reset-password-with-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code, newPassword: newPass })
        });
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to reset password');
        }
    }

    useEffect(() => {
        const checkFirebase = setInterval(() => {
            const firebase = (window as any).firebase;
            if (firebase && firebase.auth) {
                clearInterval(checkFirebase);
                try {
                    initFirebase(firebase);
                } catch (e) {
                    console.error("Init Error:", e);
                }

                firebase.auth().onAuthStateChanged(async (user: any) => {
                    if (user) {
                        try {
                            const userRef = firebase.database().ref('users/' + user.uid);
                            const snap = await userRef.once('value');
                            let val = snap.val() || {};

                            if (!val.friendCode || !val.nickname) {
                                const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                                const updates = {
                                    email: user.email,
                                    nickname: val.nickname || user.email?.split('@')[0],
                                    friendCode: val.friendCode || newCode
                                };
                                await userRef.update(updates);
                                val = { ...val, ...updates };
                            }

                            await userRef.update({ status: 'online', lastOnline: firebase.database.ServerValue.TIMESTAMP });

                            const connectedRef = firebase.database().ref('.info/connected');
                            connectedRef.on('value', (connSnap: any) => {
                                if (connSnap.val() === true) {
                                    userRef.update({ status: 'online' });
                                    userRef.child('status').onDisconnect().set('offline');
                                    userRef.child('lastOnline').onDisconnect().set(firebase.database.ServerValue.TIMESTAMP);
                                }
                            });

                            setCurrentUser({
                                uid: user.uid,
                                email: user.email,
                                emailVerified: user.emailVerified,
                                nickname: val.nickname,
                                friendCode: val.friendCode
                            });
                        } catch (err) {
                            console.error("Error fetching profile", err);
                            setCurrentUser({
                                uid: user.uid,
                                email: user.email,
                                emailVerified: user.emailVerified
                            });
                        }
                    } else {
                        setCurrentUser(null);
                    }
                    setLoading(false);
                });
            }
        }, 100);

        setTimeout(() => {
            clearInterval(checkFirebase);
            if (loading) setLoading(false);
        }, 5000);

        return () => clearInterval(checkFirebase);
    }, []);

    const value = {
        currentUser,
        signup,
        login,
        logout,
        sendAuthCode,
        verifyEmailCode,
        resetPasswordWithCode,
        deleteAccount,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
