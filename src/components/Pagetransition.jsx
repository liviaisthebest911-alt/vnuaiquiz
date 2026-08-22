import { motion } from 'framer-motion'

// Chuyển cảnh trang: fade-in mờ dần + trượt lên rất nhẹ (không bay từ ngoài
// vào), duration hơi dài + ease-in-out mềm mại cho cảm giác sang trọng.
const variants = {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
}

export default function PageTransition({ children, pageKey }) {
    return (
        <motion.div
            key={pageKey}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={variants}
            transition={{ duration: 0.45, ease: 'easeInOut' }}
        >
            {children}
        </motion.div>
    )
}
