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
            <div className="study-empty justify-center p-10">
                Chưa có câu hỏi để tạo flashcard.
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-2xl space-y-5">

            <div className="flex flex-col gap-1 text-center">
                <span className="text-xs font-bold uppercase tracking-wider text-lilac-ink">
                    Flashcard
                </span>

                <h1 className="text-3xl font-extrabold text-blossom-text">
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
                    <div className="flashcard-face absolute inset-0 flex flex-col justify-between rounded-3xl border border-blossom-border bg-blossom-card p-6 shadow-soft">
                        <div className="chip chip-cloud self-start">
                            {card.chapterName}
                        </div>

                        <div className="font-display text-xl font-extrabold leading-8 text-blossom-text">
                            {card.question}
                        </div>

                        <div className="text-center text-xs text-blossom-muted dark:text-blossom-muted-dark">
                            Bấm để xem đáp án ↻
                        </div>
                    </div>

                    {/* Mặt sau: đáp án đúng + giải thích */}
                    <div className="flashcard-face flashcard-face--back flex flex-col justify-between rounded-3xl border border-lilac bg-lilac p-6">
                        <div className="text-xs font-bold uppercase tracking-wider text-lilac-ink">
                            Đáp án đúng
                        </div>

                        <div className="font-display text-xl font-extrabold leading-8 text-blossom-text">
                            {card.options[card.answer]}
                        </div>

                        <div className="rounded-2xl bg-blossom-card/80 p-3 text-sm leading-6 text-blossom-text">
                            {card.explanation}
                        </div>
                    </div>
                </button>
            </div>

            <div className="flex items-center justify-between gap-2">

                <button
                    onClick={goPrev}
                    className="inline-flex min-h-[48px] items-center gap-2 rounded-full border border-blossom-border bg-blossom-card px-4 text-sm font-semibold text-blossom-text transition-all hover:scale-[1.02] hover:border-cloud active:scale-[0.97]"
                >
                    <ArrowLeft size={17} />
                    Trước
                </button>

                <button
                    onClick={reshuffle}
                    className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-lilac px-4 text-sm font-semibold text-lilac-ink transition-all hover:scale-[1.02] active:scale-[0.97]"
                >
                    <Shuffle size={17} />
                    {/* < 640px: chỉ hiện icon để 4 nút vừa một hàng (360px); nhãn vẫn là tên truy cập */}
                    <span className="sr-only sm:not-sr-only">Xáo bài</span>
                </button>

                <button
                    onClick={() => setFlipped((v) => !v)}
                    className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-lilac px-4 text-sm font-semibold text-lilac-ink transition-all hover:scale-[1.02] active:scale-[0.97]"
                >
                    <RotateCw size={17} />
                    <span className="sr-only sm:not-sr-only">Lật thẻ</span>
                </button>

                <button
                    onClick={goNext}
                    className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-blossom-accent px-5 text-sm font-bold text-[rgb(var(--c-on-cta))] transition-all hover:scale-[1.02] hover:bg-blossom-accent-hover active:scale-[0.97]"
                >
                    Tiếp
                    <ArrowRight size={17} />
                </button>

            </div>
        </div>
    )
}
