import React, { createContext, useContext, useEffect, useState } from 'react';
import { PIECE_NAME } from '../core/constants';
import { PieceType } from '../core/types';

interface AssetContextType {
    isLoading: boolean;
    progress: number;
}

const AssetContext = createContext<AssetContextType>({ isLoading: true, progress: 0 });

export function useAssets() {
    return useContext(AssetContext);
}

export function AssetProvider({ children }: { children: React.ReactNode }) {
    const [isLoading, setIsLoading] = useState(true);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const loadAssets = async () => {
            // Get all piece types that have images
            const pieceTypes = Object.keys(PIECE_NAME)
                .map(k => parseInt(k))
                .filter(type => type !== PieceType.EMPTY);

            const total = pieceTypes.length * 2; // Black and White for each
            let loaded = 0;

            const increment = () => {
                loaded++;
                setProgress(Math.round((loaded / total) * 100));
                if (loaded === total) {
                    setIsLoading(false);
                }
            };

            // Preload images
            for (const type of pieceTypes) {
                const name = PIECE_NAME[type as PieceType];

                const imgW = new Image();
                imgW.src = `images/w${name}.png`;
                imgW.onload = increment;
                imgW.onerror = increment; // Continue even if one fails

                const imgB = new Image();
                imgB.src = `images/b${name}.png`;
                imgB.onload = increment;
                imgB.onerror = increment;
            }
        };

        loadAssets();
    }, []);

    if (isLoading) {
        return (
            <div style={{
                height: '100vh',
                background: '#121212',
                color: 'white',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'Inter, sans-serif'
            }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>♟️</div>
                <h3 style={{ marginBottom: '1rem' }}>Loading Assets...</h3>
                <div style={{ width: '200px', height: '4px', background: '#333', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${progress}%`, height: '100%', background: '#6366f1', transition: 'width 0.2s' }}></div>
                </div>
                <p style={{ marginTop: '0.5rem', opacity: 0.5, fontSize: '0.8rem' }}>{progress}%</p>
            </div>
        );
    }

    return (
        <AssetContext.Provider value={{ isLoading, progress }}>
            {children}
        </AssetContext.Provider>
    );
}
