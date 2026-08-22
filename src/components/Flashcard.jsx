import {
    ArrowLeft,
    ArrowRight,
    RotateCw,
    Shuffle,
} from 'lucide-react'

import { useMemo, useState } from 'react'

function shuffle(items) {
    return [...items].sort(() => Math.random() - 0.5)
}

export default function Flashcard({ questions }) {
    const [deck, setDeck] = useState(() => shuffle(questions))
    const [index, setIndex] = useState(0)
    const [flipped, setFlipped] = useState(false)

    const card = deck[index] || null

    const goNext = () => {
        setFlipped(false)

        setIndex((value) =>
            value + 1 >= deck.length ? 0 : value + 1,
        )
    }

    const goPrev = () => {
        setFlipped(false)

        setIndex((value) =>
            value - 1 < 0 ? deck.length - 1 : value - 1,
        )
    }

    const reshuffle = () => {
        setDeck(shuffle(questions))
        setIndex(0)
        setFlipped(false)
    }

    if (!card) {
        return (
            <div className="rounded-2xl border border-blossom-border bg-blossom-card p-10 text-center text-blossom-muted dark:border-blossom-border-dark dark:bg-blossom-card-dark dark:text-blossom-muted-dark">
                Chưa có câu hỏi để tạo flashcard.
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-2xl space-y-5">

            <div className="flex flex-col gap-1 text-center">
                <span className="text-xs font-semibold uppercase tracking-wider text-blossom-accent dark:text-blossom-accent-dark">
                    Flashcard Mode
                </span>

                <h1 className="text-2xl font-bold text-blossom-text dark:text-blossom-text-dark">
                    Thẻ ghi nhớ nhanh
                </h1>

                <p className="text-sm text-blossom-muted dark:text-blossom-muted-dark">
                    Thẻ {index + 1}/{deck.length} · Bấm vào thẻ để lật xem đáp án
                </p>
            </div>

            {/* Vùng chứa thẻ 3D — bấm để lật */}
            <div className="flashcard-scene mx-auto h-80 w-full max-w-xl">
                <button
                    onClick={() => setFlipped((v) => !v)}
                    aria-label="Lật thẻ để xem đáp án"
                    className={`flashcard-inner relative h-full w-full text-left ${
                        flipped ? 'is-flipped' : ''
                    }`}
                >
                    {/* Mặt trước: câu hỏi */}
                    <div className="flashcard-face absolute inset-0 flex flex-col justify-between rounded-2xl border border-blossom-border bg-blossom-card p-6 shadow-soft dark:border-blossom-border-dark dark:bg-blossom-card-dark dark:shadow-soft-dark">
                        <div className="rounded-lg bg-blossom-card-soft px-3 py-1.5 text-xs font-semibold text-blossom-accent dark:bg-blossom-card-soft-dark dark:text-blossom-accent-dark">
                            {card.chapterName}
                        </div>

                        <div className="text-lg font-bold leading-7 text-blossom-text dark:text-blossom-text-dark">
                            {card.question}
                        </div>

                        <div className="text-center text-xs text-blossom-muted dark:text-blossom-muted-dark">
                            Bấm để xem đáp án ↻
                        </div>
                    </div>

                    {/* Mặt sau: đáp án đúng + giải thích */}
                    <div className="flashcard-face flashcard-face--back flex flex-col justify-between rounded-2xl border border-blossom-accent/30 bg-blossom-accent/10 p-6 dark:border-blossom-accent-dark/30 dark:bg-blossom-accent-dark/15">
                        <div className="text-xs font-semibold text-blossom-accent dark:text-blossom-accent-dark">
                            Đáp án đúng
                        </div>

                        <div className="text-lg font-bold leading-7 text-blossom-text dark:text-blossom-text-dark">
                            {card.options[card.answer]}
                        </div>

                        <div className="rounded-lg bg-blossom-card/70 p-3 text-sm leading-6 text-blossom-text/85 dark:bg-blossom-card-dark/60 dark:text-blossom-text-dark/85">
                            {card.explanation}
                        </div>
                    </div>
                </button>
            </div>

            <div className="flex items-center justify-between gap-2">

                <button
                    onClick={goPrev}
                    className="inline-flex items-center gap-2 rounded-xl border border-blossom-border px-4 py-2.5 text-sm font-medium text-blossom-text transition-all hover:scale-[1.03] hover:bg-blossom-card-soft active:scale-95 dark:border-blossom-border-dark dark:text-blossom-text-dark dark:hover:bg-blossom-card-soft-dark"
                >
                    <ArrowLeft size={17} />
                    Trước
                </button>

                <button
                    onClick={reshuffle}
                    className="inline-flex items-center gap-2 rounded-xl bg-blossom-card-soft px-4 py-2.5 text-sm font-medium text-blossom-text transition-all hover:scale-[1.03] active:scale-95 dark:bg-blossom-card-soft-dark dark:text-blossom-text-dark"
                >
                    <Shuffle size={17} />
                    Xáo bài
                </button>

                <button
                    onClick={() => setFlipped((v) => !v)}
                    className="inline-flex items-center gap-2 rounded-xl bg-blossom-card-soft px-4 py-2.5 text-sm font-medium text-blossom-text transition-all hover:scale-[1.03] active:scale-95 dark:bg-blossom-card-soft-dark dark:text-blossom-text-dark"
                >
                    <RotateCw size={17} />
                    Lật thẻ
                </button>

                <button
                    onClick={goNext}
                    className="inline-flex items-center gap-2 rounded-xl bg-blossom-accent px-4 py-2.5 text-sm font-bold text-white transition-all hover:scale-[1.03] hover:bg-blossom-accent-hover active:scale-95 dark:bg-blossom-accent-dark dark:hover:bg-blossom-accent-dark-hover"
                >
                    Tiếp
                    <ArrowRight size={17} />
                </button>

            </div>
        </div>
    )
}
