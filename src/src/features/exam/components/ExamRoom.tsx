import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExamMeta, UserAnswerRecord } from '../types';
import { examStorage } from '../examStorage';
import { useExamTimer } from '../useExamTimer';
import { calculatePartResults, getWrongQuestionIds, buildChapterDiagnosis } from '../scoring';
import StickyTimer from './StickyTimer';
import QuestionMinimap from './QuestionMinimap';
import QuestionAnswerInput from './QuestionAnswerInput';

interface Props {
    exam: ExamMeta;
}

export default function ExamRoom({ exam }: Props) {
    const navigate = useNavigate();
    // Nạp lại session cũ nếu người dùng reload giữa chừng (tự phục hồi tiến độ)
    const session = useMemo(() => examStorage.loadSession(exam.id), [exam.id]);
    const [answers, setAnswers] = useState<Record<string, UserAnswerRecord>>(session?.answers || {});
    const [currentIndex, setCurrentIndex] = useState(session?.currentQuestionIndex || 0);

    const currentQuestion = exam.questions[currentIndex];

    const persist = useCallback(
        (nextAnswers: Record<string, UserAnswerRecord>, idx: number) => {
            if (!session) return;
            examStorage.saveSession({ ...session, answers: nextAnswers, currentQuestionIndex: idx });
        },
        [session]
    );

    const setAnswer = (value: UserAnswerRecord['value']) => {
        const currentStatus = answers[currentQuestion.id]?.status;
        const next: Record<string, UserAnswerRecord> = {
            ...answers,
            [currentQuestion.id]: {
                questionId: currentQuestion.id,
                value,
                status: currentStatus === 'FLAGGED' ? 'FLAGGED' : 'ANSWERED',
            },
        };
        setAnswers(next);
        persist(next, currentIndex);
    };

    const toggleFlag = () => {
        const existing = answers[currentQuestion.id];
        const nextStatus =
            existing?.status === 'FLAGGED' ? (existing.value != null ? 'ANSWERED' : 'UNANSWERED') : 'FLAGGED';
        const next: Record<string, UserAnswerRecord> = {
            ...answers,
            [currentQuestion.id]: {
                questionId: currentQuestion.id,
                value: existing?.value ?? null,
                status: nextStatus,
            },
        };
        setAnswers(next);
        persist(next, currentIndex);
    };

    const jumpTo = (idx: number) => {
        setCurrentIndex(idx);
        persist(answers, idx);
    };

    const submitExam = useCallback(() => {
        if (!session) return;
        const partResults = calculatePartResults(exam.questions, answers, exam.scoreConfig);
        const totalScore = Math.round(partResults.reduce((sum, p) => sum + p.score, 0) * 100) / 100;
        const wrongIds = getWrongQuestionIds(exam.questions, answers);
        const chapterDiagnosis = buildChapterDiagnosis(exam.questions, wrongIds);

        const result = {
            examId: exam.id,
            examTitle: exam.title,
            submittedAt: Date.now(),
            timeSpentSeconds: Math.floor((Date.now() - session.startedAt) / 1000),
            targetScore: session.targetScore,
            totalScore,
            partResults,
            wrongQuestionIds: wrongIds,
            chapterDiagnosis,
        };

        examStorage.saveResult(result);
        examStorage.clearSession(exam.id);

        // Truyền kèm questions + answers qua router state để trang Report render lưới xem lại
        navigate(`/thi-thu/${exam.id}/ket-qua`, { state: { result, questions: exam.questions, answers } });
    }, [exam, answers, session, navigate]);

    const remaining = useExamTimer(exam.durationMinutes, session?.startedAt ?? Date.now(), submitExam);

    if (!session) {
        return (
            <div className="p-8 text-center text-rose-600">
                Không tìm thấy phiên thi. Vui lòng quay lại Sảnh chờ để bắt đầu.
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-rose-50">
            <StickyTimer seconds={remaining} />

            <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6 p-4 md:p-8">
                {/* Vùng câu hỏi - Focus Mode */}
                <div className="md:col-span-3 bg-white rounded-3xl border border-rose-100 shadow-sm p-6">
                    <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-rose-400">
              Câu {currentIndex + 1}/{exam.questions.length} · Phần {currentQuestion.part}
            </span>
                        <button
                            onClick={toggleFlag}
                            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                                answers[currentQuestion.id]?.status === 'FLAGGED'
                                    ? 'bg-amber-100 border-amber-300 text-amber-700'
                                    : 'border-rose-200 text-rose-500'
                            }`}
                        >
                            🚩 Đánh dấu xem lại
                        </button>
                    </div>

                    <p className="text-rose-900 font-medium leading-relaxed mb-5">{currentQuestion.content}</p>

                    <QuestionAnswerInput
                        question={currentQuestion}
                        value={answers[currentQuestion.id]?.value ?? null}
                        onChange={setAnswer}
                    />

                    <div className="flex justify-between mt-8">
                        <button
                            disabled={currentIndex === 0}
                            onClick={() => jumpTo(currentIndex - 1)}
                            className="px-4 py-2 rounded-xl border border-rose-200 text-rose-600 disabled:opacity-30"
                        >
                            ← Câu trước
                        </button>

                        {currentIndex < exam.questions.length - 1 ? (
                            <button onClick={() => jumpTo(currentIndex + 1)} className="px-4 py-2 rounded-xl bg-rose-400 text-white">
                                Câu sau →
                            </button>
                        ) : (
                            <button onClick={submitExam} className="px-5 py-2 rounded-xl bg-rose-500 text-white font-semibold">
                                Nộp bài
                            </button>
                        )}
                    </div>
                </div>

                {/* Question Mini-map */}
                <div className="bg-white rounded-3xl border border-rose-100 shadow-sm p-5 h-fit">
                    <h4 className="text-sm font-semibold text-rose-800 mb-3">Bản đồ câu hỏi</h4>
                    <QuestionMinimap questions={exam.questions} answers={answers} currentIndex={currentIndex} onJump={jumpTo} />

                    <div className="mt-4 space-y-1 text-xs text-rose-500">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded bg-gray-100 border border-gray-200" /> Chưa làm
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded bg-rose-200 border border-rose-300" /> Đã làm
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300" /> Đã đánh dấu
                        </div>
                    </div>

                    <button onClick={submitExam} className="mt-5 w-full py-2 rounded-xl bg-rose-500 text-white text-sm font-medium">
                        Nộp bài sớm
                    </button>
                </div>
            </div>
        </div>
    );
}