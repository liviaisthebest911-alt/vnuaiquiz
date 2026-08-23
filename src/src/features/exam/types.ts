// =========================================================
// TYPES - Phân hệ "Thi thử THPT Quốc gia"
// Tương thích cấu trúc JSON tĩnh hiện tại, mở rộng thêm field
// =========================================================

export type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
export type ExamPart = 1 | 2 | 3;
export type Difficulty = 'easy' | 'medium' | 'hard';

// Phần II: mỗi câu có 4 ý nhỏ a,b,c,d - mỗi ý Đúng/Sai độc lập
export interface TrueFalseStatement {
    id: string; // 'a' | 'b' | 'c' | 'd'
    content: string;
    isCorrect: boolean;
}

export interface Question {
    id: string;
    part: ExamPart;
    type: QuestionType;
    chapter: string; // dùng để chẩn đoán kiến thức ở trang Report
    content: string;
    options?: string[]; // MULTIPLE_CHOICE
    correctOption?: number; // index đáp án đúng - MULTIPLE_CHOICE
    statements?: TrueFalseStatement[]; // TRUE_FALSE
    correctAnswer?: string; // SHORT_ANSWER
    explanation: string;
    difficulty?: Difficulty;
}

export interface PartSummary {
    part: ExamPart;
    label: string;
    questionCount: number;
}

export interface ExamMeta {
    id: string;
    title: string;
    description: string;
    difficulty: Difficulty;
    durationMinutes: number;
    partsSummary: PartSummary[];
    // Điểm cho 1 câu ở từng phần (đơn vị điểm/câu), dùng để tính điểm tổng /10
    scoreConfig: { part1Unit: number; part2Unit: number; part3Unit: number };
    questions: Question[];
}

export type QuestionStatus = 'UNANSWERED' | 'ANSWERED' | 'FLAGGED';

export interface UserAnswerRecord {
    questionId: string;
    // MULTIPLE_CHOICE: number (index) | SHORT_ANSWER: string | TRUE_FALSE: Record<statementId, boolean>
    value: number | string | Record<string, boolean> | null;
    status: QuestionStatus;
}

// Trạng thái phiên thi đang diễn ra - lưu LocalStorage để có thể refresh không mất bài
export interface ExamSession {
    examId: string;
    targetScore: number;
    startedAt: number; // epoch ms
    durationMinutes: number;
    answers: Record<string, UserAnswerRecord>;
    currentQuestionIndex: number;
}

export interface PartResult {
    part: ExamPart;
    correct: number;
    wrong: number;
    blank: number;
    score: number;
    maxScore: number;
}

export interface ChapterDiagnosis {
    chapter: string;
    wrongCount: number;
    totalCount: number;
}

export interface ExamResult {
    examId: string;
    examTitle: string;
    submittedAt: number;
    timeSpentSeconds: number;
    targetScore: number;
    totalScore: number;
    partResults: PartResult[];
    wrongQuestionIds: string[];
    chapterDiagnosis: ChapterDiagnosis[];
}