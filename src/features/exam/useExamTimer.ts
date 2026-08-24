import { useEffect, useRef, useState } from 'react';

/**
 * Tính remaining dựa trên timestamp thực (startedAt), KHÔNG đếm bằng setInterval thuần
 * => tránh lệch giờ khi tab bị đóng/mở lại hoặc máy bị sleep.
 */
export function useExamTimer(durationMinutes: number, startedAt: number, onExpire: () => void) {
    const totalSeconds = durationMinutes * 60;
    const expiredRef = useRef(false);

    const computeRemaining = () => {
        const elapsed = Math.floor((Date.now() - startedAt) / 1000);
        return Math.max(totalSeconds - elapsed, 0);
    };

    const [remaining, setRemaining] = useState(computeRemaining);

    useEffect(() => {
        const interval = setInterval(() => {
            const left = computeRemaining();
            setRemaining(left);
            if (left <= 0 && !expiredRef.current) {
                expiredRef.current = true;
                clearInterval(interval);
                onExpire();
            }
        }, 1000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startedAt, totalSeconds]);

    return remaining;
}