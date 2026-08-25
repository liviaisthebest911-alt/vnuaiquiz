import { ExamMeta, Question } from './types';
import defaultQuestions from '../../data/questions.json';

// =========================================================
// Xây dựng đề "Thi thử THPTQG" 3 phần từ ngân hàng câu hỏi
// Phần I  : 18 câu trắc nghiệm x 0.25đ = 4.5đ (lấy từ questions.json)
// Phần II : 4 câu đúng/sai x tối đa 1đ  = 4.0đ (soạn riêng)
// Phần III: 6 câu trả lời ngắn x 0.25đ  = 1.5đ (soạn riêng)
// Tổng: 10 điểm - đúng thang điểm mà scoring.ts đã cài sẵn
// =========================================================

const CHAPTER = 'Java Collections Framework';

function buildPart1(): Question[] {
    return defaultQuestions.slice(0, 18).map((q) => ({
        id: `p1-${q.id}`,
        part: 1 as const,
        type: 'MULTIPLE_CHOICE' as const,
        chapter: CHAPTER,
        content: q.question,
        options: q.options,
        correctOption: q.answer,
        explanation: q.explanation,
    }));
}

function buildPart2(): Question[] {
    return [
        {
            id: 'p2-1',
            part: 2,
            type: 'TRUE_FALSE',
            chapter: CHAPTER,
            content: 'Cho các phát biểu sau về List trong Java Collections Framework:',
            statements: [
                { id: 'a', content: 'ArrayList cho phép truy cập ngẫu nhiên phần tử với độ phức tạp O(1).', isCorrect: true },
                { id: 'b', content: 'LinkedList lưu trữ phần tử trong một mảng có kích thước cố định.', isCorrect: false },
                { id: 'c', content: 'List cho phép các phần tử trùng lặp và duy trì thứ tự chèn.', isCorrect: true },
                { id: 'd', content: 'Vector là lớp triển khai List nhưng không đồng bộ hoá (not thread-safe).', isCorrect: false },
            ],
            explanation:
                'ArrayList dùng mảng động nên truy cập theo chỉ số là O(1). LinkedList dùng danh sách liên kết đôi, không phải mảng cố định. List cho phép trùng lặp và giữ thứ tự chèn. Vector thì ngược lại với phát biểu d — Vector là đồng bộ hoá (thread-safe), đó là điểm khác biệt chính với ArrayList.',
        },
        {
            id: 'p2-2',
            part: 2,
            type: 'TRUE_FALSE',
            chapter: CHAPTER,
            content: 'Cho các phát biểu sau về Set trong Java Collections Framework:',
            statements: [
                { id: 'a', content: 'HashSet không đảm bảo thứ tự duyệt phần tử.', isCorrect: true },
                { id: 'b', content: 'LinkedHashSet duy trì thứ tự chèn của các phần tử.', isCorrect: true },
                { id: 'c', content: 'TreeSet sắp xếp phần tử theo thứ tự tự nhiên hoặc theo Comparator tuỳ chỉnh.', isCorrect: true },
                { id: 'd', content: 'Set cho phép lưu các phần tử trùng lặp giống như List.', isCorrect: false },
            ],
            explanation:
                'Cả ba lớp triển khai Set (HashSet, LinkedHashSet, TreeSet) đều đúng như mô tả. Riêng đặc trưng cốt lõi của Set là KHÔNG cho phép phần tử trùng lặp, khác với List.',
        },
        {
            id: 'p2-3',
            part: 2,
            type: 'TRUE_FALSE',
            chapter: CHAPTER,
            content: 'Cho các phát biểu sau về Map trong Java Collections Framework:',
            statements: [
                { id: 'a', content: 'Map lưu trữ dữ liệu dưới dạng các cặp key-value.', isCorrect: true },
                { id: 'b', content: 'Trong một Map, các key có thể trùng lặp nhưng value thì không.', isCorrect: false },
                { id: 'c', content: 'Gọi put() với một key đã tồn tại sẽ ghi đè value cũ bằng value mới.', isCorrect: true },
                { id: 'd', content: 'HashMap cho phép tối đa một key có giá trị null.', isCorrect: true },
            ],
            explanation:
                'Map lưu theo cặp key-value, key là duy nhất (không trùng lặp) trong khi value có thể trùng nhau — ngược với phát biểu b. put() với key đã tồn tại sẽ cập nhật (ghi đè) value. HashMap cho phép đúng một key null.',
        },
        {
            id: 'p2-4',
            part: 2,
            type: 'TRUE_FALSE',
            chapter: CHAPTER,
            content: 'Cho các phát biểu sau về Queue/Deque trong Java Collections Framework:',
            statements: [
                { id: 'a', content: 'Queue là cấu trúc dữ liệu hoạt động theo nguyên tắc FIFO (vào trước ra trước).', isCorrect: true },
                { id: 'b', content: 'Deque là viết tắt của "Double Ended Queue" - hàng đợi hai đầu.', isCorrect: true },
                { id: 'c', content: 'Deque chỉ cho phép thêm và lấy phần tử ở một đầu duy nhất.', isCorrect: false },
                { id: 'd', content: 'Deque có thể được sử dụng để mô phỏng cấu trúc Stack (LIFO).', isCorrect: true },
            ],
            explanation:
                'Queue theo nguyên tắc FIFO. Deque = Double Ended Queue, cho phép thao tác ở CẢ HAI đầu (không phải một đầu như phát biểu c nói), nhờ đó Deque có thể mô phỏng cả Stack (LIFO) lẫn Queue (FIFO).',
        },
    ];
}

function buildPart3(): Question[] {
    return [
        {
            id: 'p3-1',
            part: 3,
            type: 'SHORT_ANSWER',
            chapter: CHAPTER,
            content:
                'Interface nào trong java.util là gốc (root interface) của toàn bộ cây phân cấp Collection (không tính Map)? (Viết tên interface, ví dụ: List)',
            correctAnswer: 'Collection',
            explanation: 'Collection là interface gốc, các interface con phổ biến là List, Set, Queue.',
        },
        {
            id: 'p3-2',
            part: 3,
            type: 'SHORT_ANSWER',
            chapter: CHAPTER,
            content: 'Lớp nào triển khai Map và tự động sắp xếp các key theo thứ tự tự nhiên?',
            correctAnswer: 'TreeMap',
            explanation: 'TreeMap dùng cây đỏ-đen (Red-Black Tree) để giữ các key luôn có thứ tự.',
        },
        {
            id: 'p3-3',
            part: 3,
            type: 'SHORT_ANSWER',
            chapter: CHAPTER,
            content: 'Phương thức của Map dùng để lấy giá trị theo key, trả về null nếu key không tồn tại, là gì? (chỉ viết tên phương thức)',
            correctAnswer: 'get',
            explanation: 'map.get(key) trả về value tương ứng, hoặc null nếu không có key đó.',
        },
        {
            id: 'p3-4',
            part: 3,
            type: 'SHORT_ANSWER',
            chapter: CHAPTER,
            content: 'Lớp triển khai List nào sử dụng cấu trúc danh sách liên kết đôi (doubly linked list)?',
            correctAnswer: 'LinkedList',
            explanation: 'LinkedList phù hợp cho thao tác chèn/xoá ở giữa danh sách với chi phí thấp hơn ArrayList.',
        },
        {
            id: 'p3-5',
            part: 3,
            type: 'SHORT_ANSWER',
            chapter: CHAPTER,
            content: 'Gói (package) chứa phần lớn các lớp và interface của Java Collections Framework là gì?',
            correctAnswer: 'java.util',
            explanation: 'Các thành phần như List, Set, Map, ArrayList, HashMap... đều nằm trong java.util.',
        },
        {
            id: 'p3-6',
            part: 3,
            type: 'SHORT_ANSWER',
            chapter: CHAPTER,
            content: 'Lớp triển khai Set nào duy trì đúng thứ tự chèn của các phần tử (không sắp xếp lại)?',
            correctAnswer: 'LinkedHashSet',
            explanation: 'LinkedHashSet kết hợp HashSet với một danh sách liên kết để giữ thứ tự chèn.',
        },
    ];
}

export function buildThptqgExam(): ExamMeta {
    const part1 = buildPart1();
    const part2 = buildPart2();
    const part3 = buildPart3();

    return {
        id: 'thptqg-jcf-01',
        title: 'Đề thi thử THPTQG - Java Collections Framework',
        description:
            'Đề thi thử mô phỏng cấu trúc THPTQG gồm 3 phần: Trắc nghiệm, Đúng/Sai và Trả lời ngắn, tập trung vào chủ đề Java Collections Framework.',
        difficulty: 'medium',
        durationMinutes: 45,
        partsSummary: [
            { part: 1, label: 'Phần I - Trắc nghiệm', questionCount: part1.length },
            { part: 2, label: 'Phần II - Đúng/Sai', questionCount: part2.length },
            { part: 3, label: 'Phần III - Trả lời ngắn', questionCount: part3.length },
        ],
        scoreConfig: { part1Unit: 0.25, part2Unit: 1, part3Unit: 0.25 },
        questions: [...part1, ...part2, ...part3],
    };
}