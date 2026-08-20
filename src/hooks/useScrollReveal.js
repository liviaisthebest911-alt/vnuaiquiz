import { useEffect, useRef, useState } from 'react'

/**
 * Trả về [ref, isVisible]. Gắn ref vào phần tử cần hiệu ứng "hiện dần khi
 * scroll tới". Dùng chung với class .reveal / .reveal.is-visible trong
 * src/index.css (animation fade-in-up khai báo ở tailwind.config.js).
 *
 * Chỉ trigger MỘT LẦN (unobserve sau khi hiện) để tránh phần tử nhấp nháy
 * lại mỗi lần scroll qua lại — giữ chuyển động tinh tế, không gây phân tâm.
 */
export function useScrollReveal(options = {}) {
    const { threshold = 0.15, rootMargin = '0px 0px -40px 0px' } = options

    const ref = useRef(null)
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const node = ref.current

        if (!node) {
            return undefined
        }

        // Trình duyệt không hỗ trợ IntersectionObserver -> hiện luôn, không lỗi
        if (typeof IntersectionObserver === 'undefined') {
            setIsVisible(true)
            return undefined
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true)
                    observer.unobserve(node)
                }
            },
            { threshold, rootMargin },
        )

        observer.observe(node)

        return () => observer.disconnect()
    }, [threshold, rootMargin])

    return [ref, isVisible]
}
