import { useEffect, useState } from 'react';

interface Props {
    score: number;
    maxScore?: number;
}

export default function CircularScore({ score, maxScore = 10 }: Props) {
    const [displayScore, setDisplayScore] = useState(0);
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const progress = (Math.min(displayScore, maxScore) / maxScore) * circumference;

    useEffect(() => {
        const duration = 1400;
        const start = performance.now();
        let frame: number;

        const animate = (now: number) => {
            const t = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
            setDisplayScore(Math.round(score * eased * 100) / 100);
            if (t < 1) frame = requestAnimationFrame(animate);
        };
        frame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frame);
    }, [score]);

    return (
        <svg width="180" height="180" viewBox="0 0 180 180">
            <circle cx="90" cy="90" r={radius} fill="none" stroke="#fce7f3" strokeWidth="14" />
            <circle
                cx="90"
                cy="90"
                r={radius}
                fill="none"
                stroke="#fb7185"
                strokeWidth="14"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - progress}
                strokeLinecap="round"
                transform="rotate(-90 90 90)"
                style={{ transition: 'stroke-dashoffset 0.1s linear' }}
            />
            <text x="90" y="98" textAnchor="middle" fontSize="32" fontWeight="700" fill="#9f1239">
                {displayScore.toFixed(2)}
            </text>
        </svg>
    );
}