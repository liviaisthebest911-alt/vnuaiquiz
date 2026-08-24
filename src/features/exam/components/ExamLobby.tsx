import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExamMeta } from '../types';
import { examStorage } from '../examStorage';

interface Props {
    exam: ExamMeta;
}

const DIFFICULTY_LABEL: Record<string, string> = {
    easy: 'Dễ',
    medium: 'Trung bình',
    hard: 'Khó',
};

export default function ExamLobby({ exam }: Props) {
    const navigate = useNavigate();
    const [targetScore, setTargetScore] = useState<number>(8);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleConfirmEnter = () => {
        examStorage.saveSession({
            examId: exam.id,
            targetScore,
            startedAt: Date.now(),
            durationMinutes: exam.durationMinutes,
            answers: {},
            currentQuestionIndex: 0,
        });
        navigate(`/thi-thu/${exam.id}/lam-bai`);
    };

    return (
        <div className="min-h-screen bg-rose-50 py-10 px-4">
            <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-sm border border-rose-100 p-8">
        <span className="inline-block text-xs font-medium text-rose-500 bg-rose-100 px-3 py-1 rounded-full">
          Độ khó: {DIFFICULTY_LABEL[exam.difficulty]}
        </span>

                <h1 className="text-2xl font-semibold text-rose-900 mt-3">{exam.title}</h1>
                <p className="text-rose-700/70 mt-2 leading-relaxed">{exam.description}</p>

                {/* Bảng tóm tắt cấu trúc đề */}
                <div className="grid grid-cols-3 gap-3 mt-6">
                    {exam.partsSummary.map(p => (
                        <div key={p.part} className="rounded-2xl bg-rose-50 border border-rose-100 p-4 text-center">
                            <div className="text-xs text-rose-500 mb-1">{p.label}</div>
                            <div className="text-xl font-semibold text-rose-900">{p.questionCount} câu</div>
                        </div>
                    ))}
                </div>

                <div className="mt-3 text-sm text-rose-800 bg-rose-50 border border-rose-100 rounded-xl p-3">
                    ⏱ Thời gian làm bài: <strong>{exam.durationMinutes} phút</strong>
                </div>

                {/* Cảnh báo quy chế chấm điểm Phần II */}
                <div className="mt-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 leading-relaxed">
                    <strong>⚠ Lưu ý cách tính điểm Phần II (Đúng/Sai):</strong> Mỗi câu gồm 4 ý a, b, c, d.
                    Đúng 1 ý = 0.1đ · Đúng 2 ý = 0.25đ · Đúng 3 ý = 0.5đ · Đúng cả 4 ý = 1đ.
                    Đây KHÔNG phải thang điểm cộng dồn tuyến tính, hãy cẩn trọng khi phân bổ thời gian.
                </div>

                {/* Đặt mục tiêu điểm số */}
                <div className="mt-6">
                    <label className="block text-sm font-medium text-rose-800 mb-1">🎯 Đặt mục tiêu điểm số của bạn</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            min={0}
                            max={10}
                            step={0.25}
                            value={targetScore}
                            onChange={e => setTargetScore(Math.min(10, Math.max(0, Number(e.target.value))))}
                            className="w-28 rounded-xl border border-rose-200 px-3 py-2 focus:ring-2 focus:ring-rose-300 outline-none"
                        />
                        <span className="text-rose-400">/ 10</span>
                    </div>
                </div>

                <button
                    onClick={() => setShowConfirm(true)}
                    className="mt-8 w-full py-3 rounded-2xl bg-rose-400 hover:bg-rose-500 text-white font-semibold text-lg transition-colors shadow-sm"
                >
                    Vào phòng thi
                </button>
            </div>

            {showConfirm && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
                        <h3 className="font-semibold text-rose-900 text-lg mb-2">Xác nhận vào thi</h3>
                        <p className="text-rose-700/80 text-sm mb-5">
                            Bài thi sẽ tự động nộp khi hết giờ. Bạn đã sẵn sàng?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="flex-1 py-2 rounded-xl border border-rose-200 text-rose-600"
                            >
                                Chưa
                            </button>
                            <button
                                onClick={handleConfirmEnter}
                                className="flex-1 py-2 rounded-xl bg-rose-400 text-white font-medium"
                            >
                                Bắt đầu
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}