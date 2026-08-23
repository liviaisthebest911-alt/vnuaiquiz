import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import CircularScore from './CircularScore';
import { examStorage } from '../examStorage';
import { ExamResult, Question, UserAnswerRecord } from '../types';

interface LocationState {
    result: ExamResult;
    questions: Question[];
    answers: Record<string, UserAnswerRecord>;
}

const PART_LABELS: Record<number, string> = {
    1: 'Phần I - Trắc nghiệm',
    2: 'Phần II - Đúng/Sai',
    3: 'Phần III - Trả lời ngắn',
};

export default function ExamReport() {
    const { state } = useLocation() as { state: LocationState | null };
    const navigate = useNavigate();
    const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
    const [addedToVault, setAddedToVault] = useState(false);

    useEffect(() => {
        if (!state) navigate('/');
    }, [state, navigate]);

    if (!state) return null;
    const { result, questions, answers } = state;
    const achievedTarget = result.totalScore >= result.targetScore;

    // Bắn pháo hoa khi đạt/vượt mục tiêu, delay để trùng lúc vòng cung điểm đếm xong (~1.4s)
    useEffect(() => {
        if (!achievedTarget) return;
        const timer = setTimeout(() => {
            confetti({
                particleCount: 150,
                spread: 80,
                origin: { y: 0.4 },
                colors: ['#fda4af', '#fecdd3', '#f472b6', '#fff1f2'],
            });
        }, 1400);
        return () => clearTimeout(timer);
    }, [achievedTarget]);

    const handleAddToErrorVault = () => {
        const wrongQuestions = questions.filter(q => result.wrongQuestionIds.includes(q.id));
        examStorage.addToErrorVault(wrongQuestions);
        setAddedToVault(true);
    };

    const selectedQuestion = questions.find(q => q.id === selectedQuestionId);

    return (
        <div className="min-h-screen bg-rose-50 py-10 px-4">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Điểm tổng + hiệu ứng */}
                <div className="bg-white rounded-3xl border border-rose-100 shadow-sm p-8 text-center">
                    <h2 className="text-rose-900 font-semibold text-xl mb-2">{result.examTitle}</h2>
                    <div className="flex justify-center">
                        <CircularScore score={result.totalScore} />
                    </div>
                    <p className="text-rose-500 text-sm mt-3">
                        Mục tiêu của bạn: <strong>{result.targetScore}</strong> điểm
                        {achievedTarget ? ' 🎉 Bạn đã đạt mục tiêu!' : ' — Chưa đạt mục tiêu, cố gắng hơn ở lần sau nhé!'}
                    </p>
                    <p className="text-rose-400 text-xs mt-1">
                        Thời gian làm bài: {Math.floor(result.timeSpentSeconds / 60)} phút {result.timeSpentSeconds % 60} giây
                    </p>
                </div>

                {/* Thống kê chi tiết từng phần */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {result.partResults.map(p => (
                        <div key={p.part} className="bg-white rounded-2xl border border-rose-100 p-5">
                            <h4 className="text-sm font-semibold text-rose-800 mb-2">{PART_LABELS[p.part]}</h4>
                            <div className="text-2xl font-bold text-rose-900 mb-2">
                                {p.score}/{p.maxScore}
                            </div>
                            <div className="text-xs text-rose-500 space-y-0.5">
                                <div>✅ Đúng: {p.correct}</div>
                                <div>❌ Sai: {p.wrong}</div>
                                <div>⬜ Bỏ trống: {p.blank}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Chẩn đoán kiến thức theo chương */}
                <div className="bg-white rounded-2xl border border-rose-100 p-6">
                    <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                        <h4 className="font-semibold text-rose-800">🧠 Chẩn đoán kiến thức theo chương</h4>
                        <button
                            onClick={handleAddToErrorVault}
                            disabled={addedToVault || result.wrongQuestionIds.length === 0}
                            className="text-xs px-3 py-2 rounded-xl bg-rose-400 text-white font-medium disabled:opacity-50"
                        >
                            {addedToVault ? '✓ Đã lưu vào Sổ tay' : 'Đưa câu sai vào Sổ tay ôn tập'}
                        </button>
                    </div>

                    <div className="space-y-2">
                        {result.chapterDiagnosis.map(c => (
                            <div key={c.chapter} className="flex items-center gap-3">
                <span className="text-sm text-rose-700 w-40 truncate" title={c.chapter}>
                  {c.chapter}
                </span>
                                <div className="flex-1 h-2 rounded-full bg-rose-50 overflow-hidden">
                                    <div
                                        className="h-full bg-rose-400"
                                        style={{ width: `${c.totalCount ? (c.wrongCount / c.totalCount) * 100 : 0}%` }}
                                    />
                                </div>
                                <span className="text-xs text-rose-400 w-20 text-right shrink-0">
                  {c.wrongCount}/{c.totalCount} sai
                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Lưới xem lại bài */}
                <div className="bg-white rounded-2xl border border-rose-100 p-6">
                    <h4 className="font-semibold text-rose-800 mb-4">📋 Xem lại bài thi</h4>
                    <div className="grid grid-cols-8 sm:grid-cols-10 gap-2 mb-5">
                        {questions.map((q, idx) => {
                            const isWrong = result.wrongQuestionIds.includes(q.id);
                            const isSelected = selectedQuestionId === q.id;
                            return (
                                <button
                                    key={q.id}
                                    onClick={() => setSelectedQuestionId(q.id)}
                                    className={`w-9 h-9 rounded-xl text-xs font-medium border transition-colors
                    ${isSelected ? 'ring-2 ring-rose-400' : ''}
                    ${
                                        isWrong
                                            ? 'bg-rose-100 border-rose-300 text-rose-600'
                                            : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                                    }`}
                                >
                                    {idx + 1}
                                </button>
                            );
                        })}
                    </div>

                    {selectedQuestion && (
                        <div className="bg-rose-50 rounded-2xl p-5 border border-rose-100">
                            <p className="font-medium text-rose-900 mb-1 text-xs">
                                {result.wrongQuestionIds.includes(selectedQuestion.id) ? '❌ Câu trả lời sai' : '✅ Câu trả lời đúng'} ·{' '}
                                {selectedQuestion.chapter}
                            </p>
                            <p className="font-medium text-rose-900 mb-3">{selectedQuestion.content}</p>
                            <p className="text-sm text-rose-700 leading-relaxed">
                                <strong>Giải thích:</strong> {selectedQuestion.explanation}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}