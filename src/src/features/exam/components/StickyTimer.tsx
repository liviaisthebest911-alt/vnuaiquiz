interface Props {
    seconds: number;
}

export default function StickyTimer({ seconds }: Props) {
    const isCritical = seconds <= 300; // dưới 5 phút
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');

    return (
        <div
            className={`fixed top-4 right-4 z-40 px-4 py-2 rounded-2xl font-mono text-lg font-semibold shadow-md transition-colors
        ${isCritical ? 'bg-rose-500 text-white animate-pulse' : 'bg-white text-rose-700 border border-rose-200'}`}
        >
            {m}:{s}
        </div>
    );
}