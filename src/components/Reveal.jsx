import { useScrollReveal } from '../hooks/useScrollReveal'

/**
 * Bọc quanh 1 section/card để tự động có hiệu ứng "hiện dần + trượt lên"
 * khi người dùng scroll tới. Dùng: <Reveal delay={100}>...</Reveal>
 */
export default function Reveal({
                                   children,
                                   delay = 0,
                                   className = '',
                                   as: Tag = 'div',
                               }) {
    const [ref, isVisible] = useScrollReveal()

    return (
        <Tag
            ref={ref}
            className={`reveal ${isVisible ? 'is-visible' : ''} ${className}`}
            style={
                isVisible && delay
                    ? { animationDelay: `${delay}ms` }
                    : undefined
            }
        >
            {children}
        </Tag>
    )
}
