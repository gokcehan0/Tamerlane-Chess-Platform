export class SoundManager {
    private context: AudioContext | null = null;

    constructor() {
        try {
            this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) {
            console.error("Web Audio API not supported", e);
        }
    }

    private playTone(freq: number, type: OscillatorType, duration: number, vol: number = 0.1) {
        if (!this.context) return;
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.context.currentTime);

        gain.gain.setValueAtTime(vol, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.context.destination);

        osc.start();
        osc.stop(this.context.currentTime + duration);
    }

    playMove() {
        // Soft click sound
        this.playTone(300, 'sine', 0.1, 0.1);
    }

    playCapture() {
        // High pitch "coin" sound + impact
        this.playTone(600, 'square', 0.1, 0.1);
        setTimeout(() => this.playTone(300, 'sawtooth', 0.2, 0.15), 50);
    }

    playCheck() {
        // Warning sound
        this.playTone(150, 'sawtooth', 0.4, 0.2);
    }

    playGameEnd() {
        // Victory fanfare (simple)
        [300, 400, 500, 600].forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 'square', 0.2, 0.1), i * 150);
        });
    }
}

export const soundManager = new SoundManager();
