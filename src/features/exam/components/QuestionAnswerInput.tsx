import { Question } from '../types';

type AnswerValue = number | string | Record<string, boolean> | null;

interface Props {
    question: Question;
    value: AnswerValue;
    onChange: (value: AnswerValue) => void;
}

export default function QuestionAnswerInput({ question, value, onChange }: Props) {
    if (question.type === 'MULTIPLE_CHOICE') {
        return (
            <div className="space-y-2">
                {question.options?.map((opt, idx) => (
                    <label
                        key={idx}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors
              ${value === idx ? 'bg-rose-100 border-rose-300' : 'border-rose-100 hover:bg-rose-50'}`}
                    >
                        <input type="radio" checked={value === idx} onChange={() => onChange(idx)} className="accent-rose-500" />
                        <span className="text-rose-900 text-sm">{opt}</span>
                    </label>
                ))}
            </div>
        );
    }

    if (question.type === 'TRUE_FALSE') {
        const map = (value as Record<string, boolean>) || {};
        return (
            <div className="space-y-2">
                {question.statements?.map(st => (
                    <div key={st.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-rose-100">
            <span className="text-sm text-rose-900 flex-1">
              {st.id}) {st.content}
            </span>
                        <div className="flex gap-2 shrink-0">
                            <button
                                onClick={() => onChange({ ...map, [st.id]: true })}
                                className={`px-3 py-1 rounded-lg text-xs font-medium ${
                                    map[st.id] === true ? 'bg-rose-400 text-white' : 'bg-rose-50 text-rose-500'
                                }`}
                            >
                                Đúng
                            </button>
                            <button
                                onClick={() => onChange({ ...map, [st.id]: false })}
                                className={`px-3 py-1 rounded-lg text-xs font-medium ${
                                    map[st.id] === false ? 'bg-rose-400 text-white' : 'bg-rose-50 text-rose-500'
                                }`}
                            >
                                Sai
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // SHORT_ANSWER
    return (
        <input
            type="text"
            value={(value as string) || ''}
            onChange={e => onChange(e.target.value)}
            placeholder="Nhập đáp án của bạn..."
            className="w-full rounded-xl border border-rose-200 px-4 py-3 focus:ring-2 focus:ring-rose-300 outline-none"
        />
    );
}