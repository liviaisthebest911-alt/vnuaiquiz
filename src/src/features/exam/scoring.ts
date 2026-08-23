import { Question, UserAnswerRecord, PartResult, ExamPart, ChapterDiagnosis } from './types';

// Thang điểm 1 câu Đúng/Sai (Phần II) theo số ý đúng trong 4 ý a,b,c,d
// Đây là quy tắc đặc thù của đề thi THPT hiện hành - KHÔNG cộng điểm tuyến tính
const TRUE_FALSE_RATIO_TABLE: Record<number, number> = {
    0: 0,
    1: 0.1,
    2: 0.25,
    3: 0.5,
    4: 1.0,
};

interface UnitResult {
    correct: boolean;
    blank: boolean;
    score: number;
}

function scoreMultipleChoice(q: Question, ans: UserAnswerRecord | undefined, unit: number): UnitResult {
    if (!ans || ans.value === null || ans.value === undefined) return { correct: false, blank: true, score: 0 };
    const isCorrect = Number(ans.value) === q.correctOption;
    return { correct: isCorrect, blank: false, score: isCorrect ? unit : 0 };
}

function scoreTrueFalse(q: Question, ans: UserAnswerRecord | undefined, unitMax: number): UnitResult {
    if (!q.statements || q.statements.length === 0) return { correct: false, blank: true, score: 0 };
    const userMap = (ans?.value as Record<string, boolean>) || {};
    const answeredCount = Object.keys(userMap).length;
    if (answeredCount === 0) return { correct: false, blank: true, score: 0 };

    const correctCount = q.statements.filter(s => userMap[s.id] === s.isCorrect).length;
    const ratio = TRUE_FALSE_RATIO_TABLE[correctCount] ?? 0;
    return {
        correct: correctCount === q.statements.length,
        blank: false,
        score: Math.round(ratio * unitMax * 100) / 100,
    };
}

function scoreShortAnswer(q: Question, ans: UserAnswerRecord | undefined, unit: number): UnitResult {
    if (!ans || ans.value === null || ans.value === undefined || ans.value === '') {
        return { correct: false, blank: true, score: 0 };
    }
    const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ').replace(',', '.');
    const isCorrect = normalize(String(ans.value)) === normalize(q.correctAnswer || '');
    return { correct: isCorrect, blank: false, score: isCorrect ? unit : 0 };
}

export interface ScoreConfig {
    part1Unit: number;
    part2Unit: number;
    part3Unit: number;
}

export function calculatePartResults(
    questions: Question[],
    answers: Record<string, UserAnswerRecord>,
    scoreConfig: ScoreConfig
): PartResult[] {
    const parts: ExamPart[] = [1, 2, 3];

    return parts.map(part => {
        const partQuestions = questions.filter(q => q.part === part);
        const unit = part === 1 ? scoreConfig.part1Unit : part === 2 ? scoreConfig.part2Unit : scoreConfig.part3Unit;

        let correct = 0;
        let wrong = 0;
        let blank = 0;
        let score = 0;

        partQuestions.forEach(q => {
            const ans = answers[q.id];
            let r: UnitResult;
            if (q.type === 'MULTIPLE_CHOICE') r = scoreMultipleChoice(q, ans, unit);
            else if (q.type === 'TRUE_FALSE') r = scoreTrueFalse(q, ans, unit);
            else r = scoreShortAnswer(q, ans, unit);

            if (r.blank) blank++;
            else if (r.correct) correct++;
            else wrong++;
            score += r.score;
        });

        return {
            part,
            correct,
            wrong,
            blank,
            score: Math.round(score * 100) / 100,
            maxScore: Math.round(partQuestions.length * unit * 100) / 100,
        };
    });
}

// Một câu được coi là "sai" (để đưa vào chẩn đoán + Sổ tay ôn tập) nếu KHÔNG đạt điểm tối đa
export function getWrongQuestionIds(questions: Question[], answers: Record<string, UserAnswerRecord>): string[] {
    return questions
        .filter(q => {
            const ans = answers[q.id];
            if (!ans || ans.value === null || ans.value === undefined || ans.value === '') return true;

            if (q.type === 'MULTIPLE_CHOICE') return Number(ans.value) !== q.correctOption;

            if (q.type === 'SHORT_ANSWER') {
                const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
                return normalize(String(ans.value)) !== normalize(q.correctAnswer || '');
            }

            if (q.type === 'TRUE_FALSE' && q.statements) {
                const userMap = (ans.value as Record<string, boolean>) || {};
                return q.statements.some(s => userMap[s.id] !== s.isCorrect);
            }

            return true;
        })
        .map(q => q.id);
}

export function buildChapterDiagnosis(questions: Question[], wrongIds: string[]): ChapterDiagnosis[] {
    const chapterMap: Record<string, { wrongCount: number; totalCount: number }> = {};

    questions.forEach(q => {
        if (!chapterMap[q.chapter]) chapterMap[q.chapter] = { wrongCount: 0, totalCount: 0 };
        chapterMap[q.chapter].totalCount++;
        if (wrongIds.includes(q.id)) chapterMap[q.chapter].wrongCount++;
    });

    return Object.entries(chapterMap)
        .map(([chapter, v]) => ({ chapter, ...v }))
        .sort((a, b) => b.wrongCount - a.wrongCount);
}