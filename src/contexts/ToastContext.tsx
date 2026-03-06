
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import './Toast.css';

interface ToastMessage {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
    duration?: number;
}

interface ConfirmState {
    show: boolean;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

interface ToastContextType {
    showToast: (message: string, type?: 'success' | 'error' | 'info', duration?: number) => void;
    showConfirm: (message: string) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const [confirm, setConfirm] = useState<ConfirmState>({ show: false, message: '', onConfirm: () => {}, onCancel: () => {} });

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info', duration: number = 3000) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newToast = { id, message, type, duration };
        setToasts(prev => [...prev, newToast]);

        setTimeout(() => {
            removeToast(id);
        }, duration);
    }, [removeToast]);

    const showConfirm = useCallback((message: string): Promise<boolean> => {
        return new Promise((resolve) => {
            setConfirm({
                show: true,
                message,
                onConfirm: () => { setConfirm(c => ({ ...c, show: false })); resolve(true); },
                onCancel: () => { setConfirm(c => ({ ...c, show: false })); resolve(false); }
            });
        });
    }, []);

    return (
        <ToastContext.Provider value={{ showToast, showConfirm }}>
            {children}
            
            {/* Confirmation Modal */}
            {confirm.show && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div style={{
                        background: '#1f1f1f', borderRadius: '12px', padding: '1.5rem',
                        maxWidth: '400px', width: '90%', border: '1px solid #333',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                    }}>
                        <h3 style={{ margin: '0 0 1rem', color: '#f5f5f5', fontSize: '1.1rem' }}>Confirm Action</h3>
                        <p style={{ margin: '0 0 1.5rem', color: '#a3a3a3', lineHeight: 1.5 }}>{confirm.message}</p>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                            <button
                                onClick={confirm.onCancel}
                                style={{
                                    padding: '0.6rem 1.25rem', background: '#333', color: '#e5e5e5',
                                    border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirm.onConfirm}
                                style={{
                                    padding: '0.6rem 1.25rem', background: '#ef4444', color: 'white',
                                    border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500
                                }}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Container */}
            <div className="toast-container">
                {toasts.map(toast => (
                    <div key={toast.id} className={`toast toast-${toast.type} slide-in`}>
                        <div className="toast-content">
                            {toast.message}
                        </div>
                        <button className="toast-close" onClick={() => removeToast(toast.id)}>
                            &times;
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
