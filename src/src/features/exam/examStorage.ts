import { ExamSession, ExamResult, Question } from './types';

const SESSION_PREFIX = 'vnuaiquiz_session_';
const HISTORY_KEY = 'vnuaiquiz_exam_history';
const ERROR_VAULT_KEY = 'vnuaiquiz_error_vault';

function safeParse<T>(raw: string | null, fallback: T): T {
    if (!raw) return fallback;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

export const examStorage = {
    // ---- Phiên thi đang diễn ra (Exam Room) ----
    saveSession(session: ExamSession) {
        localStorage.setItem(SESSION_PREFIX + session.examId, JSON.stringify(session));
    },
    loadSession(examId: string): ExamSession | null {
        return safeParse<ExamSession | null>(localStorage.getItem(SESSION_PREFIX + examId), null);
    },
    clearSession(examId: string) {
        localStorage.removeItem(SESSION_PREFIX + examId);
    },

    // ---- Lịch sử kết quả thi (tối đa 50 lần gần nhất) ----
    saveResult(result: ExamResult) {
        const history = this.getHistory();
        history.unshift(result);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
    },
    getHistory(): ExamResult[] {
        return safeParse<ExamResult[]>(localStorage.getItem(HISTORY_KEY), []);
    },

    // ---- Sổ tay ôn tập (Error Vault) ----
    addToErrorVault(questions: Question[]) {
        const vault = this.getErrorVault();
        const existingIds = new Set(vault.map(q => q.id));
        const merged = [...vault, ...questions.filter(q => !existingIds.has(q.id))];
        localStorage.setItem(ERROR_VAULT_KEY, JSON.stringify(merged));
    },
    getErrorVault(): Question[] {
        return safeParse<Question[]>(localStorage.getItem(ERROR_VAULT_KEY), []);
    },
    removeFromErrorVault(questionId: string) {
        const vault = this.getErrorVault().filter(q => q.id !== questionId);
        localStorage.setItem(ERROR_VAULT_KEY, JSON.stringify(vault));
    },
};