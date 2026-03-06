import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AssetProvider } from './contexts/AssetContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import Home from './pages/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import VerifyEmail from './pages/auth/VerifyEmail';
import Lobby from './pages/Lobby';
import ClassicLobby from './pages/ClassicLobby';
import Docs from './pages/Docs';
import Game from './components/Game';
import GameRoom from './pages/GameRoom';
import ClassicGame from './pages/ClassicGame';
import Profile from './pages/Profile';
import SettingsPage from './pages/SettingsPage';


// CSS Imports
import './App.css';
import './index.css';

function App() {
    return (
        <Router>
            <AuthProvider>
                <ThemeProvider>
                    <ToastProvider>
                        <AssetProvider>
                            <Routes>
                            {/* Public Routes */}
                            <Route path="/" element={<Home />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            <Route path="/forgot-password" element={<ForgotPassword />} />
                            <Route path="/verify-email" element={<VerifyEmail />} />


                            {/* Protected Routes with Layout */}
                            <Route
                                path="/lobby"
                                element={
                                    <PrivateRoute>
                                        <Layout>
                                            <Lobby />
                                        </Layout>
                                    </PrivateRoute>
                                }
                            />

                            <Route
                                path="/docs"
                                element={
                                    <PrivateRoute>
                                        <Layout>
                                            <Docs />
                                        </Layout>
                                    </PrivateRoute>
                                }
                            />

                            <Route
                                path="/local-game"
                                element={
                                    <PrivateRoute>
                                        <Layout>
                                            <div style={{ height: '100%', overflow: 'auto', padding: '0', display: 'flex', justifyContent: 'center' }}>
                                                <Game />
                                            </div>
                                        </Layout>
                                    </PrivateRoute>
                                }
                            />

                            <Route
                                path="/profile"
                                element={
                                    <PrivateRoute>
                                        <Layout>
                                            <Profile />
                                        </Layout>
                                    </PrivateRoute>
                                }
                            />

                            <Route
                                path="/settings"
                                element={
                                    <PrivateRoute>
                                        <Layout>
                                            <SettingsPage />
                                        </Layout>
                                    </PrivateRoute>
                                }
                            />

                            <Route
                                path="/profile/:uid"
                                element={
                                    <PrivateRoute>
                                        <Layout>
                                            <Profile />
                                        </Layout>
                                    </PrivateRoute>
                                }
                            />

                            <Route
                                path="/game/:roomId"
                                element={
                                    <PrivateRoute>
                                        <Layout>
                                            <div style={{ height: '100%', overflow: 'auto', padding: '0' }}>
                                                <GameRoom />
                                            </div>
                                        </Layout>
                                    </PrivateRoute>
                                }
                            />

                            <Route
                                path="/classic-lobby"
                                element={
                                    <PrivateRoute>
                                        <Layout>
                                            <ClassicLobby />
                                        </Layout>
                                    </PrivateRoute>
                                }
                            />

                            <Route
                                path="/game/classic/:roomId"
                                element={
                                    <PrivateRoute>
                                        <Layout>
                                            <div style={{ height: '100%', overflow: 'auto', padding: '0' }}>
                                                <ClassicGame />
                                            </div>
                                        </Layout>
                                    </PrivateRoute>
                                }
                            />

                            {/* Fallback */}
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </AssetProvider>
                </ToastProvider>
            </ThemeProvider>
        </AuthProvider>
    </Router>
    );
}

export default App;
