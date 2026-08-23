import { Question, UserAnswerRecord } from '../types';

interface Props {
    questions: Question[];
    answers: Record<string, UserAnswerRecord>;
    currentIndex: number;
    onJump: (index: number) => void;
}

export default function QuestionMinimap({ questions, answers, currentIndex, onJump }: Props) {
    const getStatusClass = (q: Question, idx: number) => {
        const a = answers[q.id];
        const base = 'w-9 h-9 rounded-xl flex items-center justify-center text-xs font-medium border transition-colors';
        const ring = idx === currentIndex ? 'ring-2 ring-rose-400' : '';

        if (a?.status === 'FLAGGED') return `${base} ${ring} bg-amber-100 border-amber-300 text-amber-700`;
        if (a?.status === 'ANSWERED') return `${base} ${ring} bg-rose-200 border-rose-300 text-rose-800`;
        return `${base} ${ring} bg-gray-100 border-gray-200 text-gray-500`;
    };

    return (
        <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => (
                <button key={q.id} onClick={() => onJump(idx)} className={getStatusClass(q, idx)}>
                    {idx + 1}
                </button>
            ))}
        </div>
    );
}