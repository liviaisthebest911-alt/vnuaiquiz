import {
    AlertCircle,
    CheckCircle2,
    Download,
    FileJson,
    RotateCcw,
    Upload,
} from 'lucide-react'

import {
    useEffect,
    useState,
} from 'react'

const SAMPLE = `[
  {
    "id": 101,
    "chapter": 4,
    "chapterName": "Chương 4: Ứng dụng AI",
    "question": "Ví dụ nào là một ứng dụng của AI tạo sinh?",
    "options": [
      "Tạo văn bản từ yêu cầu",
      "Chỉ lưu file PDF",
      "Tắt máy tính",
      "Đổi tên thư mục"
    ],
    "answer": 0,
    "explanation": "AI tạo sinh có thể tạo nội dung mới như văn bản, hình ảnh, âm thanh hoặc mã từ yêu cầu đầu vào."
  }
]`

function validateQuestions(data) {
    if (
        !Array.isArray(data) ||
        data.length === 0
    ) {
        throw new Error(
            'Dữ liệu phải là một mảng JSON có ít nhất 1 câu hỏi.',
        )
    }

    data.forEach((q, index) => {
        if (!Number.isFinite(Number(q.id))) {
            throw new Error(
                `Câu ${index + 1}: id phải là số.`,
            )
        }

        if (
            !Number.isFinite(
                Number(q.chapter),
            )
        ) {
            throw new Error(
                `Câu ${index + 1}: chapter phải là số.`,
            )
        }

        if (
            !q.chapterName ||
            typeof q.chapterName !==
            'string'
        ) {
            throw new Error(
                `Câu ${index + 1}: thiếu chapterName.`,
            )
        }

        if (
            !q.question ||
            typeof q.question !== 'string'
        ) {
            throw new Error(
                `Câu ${index + 1}: thiếu question.`,
            )
        }

        if (
            !Array.isArray(q.options) ||
            q.options.length < 2
        ) {
            throw new Error(
                `Câu ${index + 1}: options phải có ít nhất 2 đáp án.`,
            )
        }

        if (
            !Number.isInteger(
                Number(q.answer),
            ) ||
            Number(q.answer) < 0 ||
            Number(q.answer) >=
            q.options.length
        ) {
            throw new Error(
                `Câu ${index + 1}: answer không hợp lệ.`,
            )
        }

        if (
            !q.explanation ||
            typeof q.explanation !== 'string'
        ) {
            throw new Error(
                `Câu ${index + 1}: thiếu explanation.`,
            )
        }
    })
}

export default function Admin({
                                  questions,
                                  onReplaceQuestions,
                                  onResetQuestions,
                                  defaultQuestions,
                              }) {
    const [text, setText] = useState('')
    const [message, setMessage] =
        useState(null)

    useEffect(() => {
        setText(
            JSON.stringify(
                questions,
                null,
                2,
            ),
        )
    }, [])

    const importData = () => {
        try {
            const parsed = JSON.parse(text)

            validateQuestions(parsed)

            onReplaceQuestions(parsed)

            setText(
                JSON.stringify(
                    parsed,
                    null,
                    2,
                ),
            )

            setMessage({
                type: 'success',
                text: `Đã cập nhật ngân hàng với ${parsed.length} câu hỏi.`,
            })
        } catch (error) {
            setMessage({
                type: 'error',
                text:
                    error.message ||
                    'JSON không hợp lệ.',
            })
        }
    }

    const downloadSample = () => {
        const blob = new Blob(
            [SAMPLE],
            {
                type: 'application/json;charset=utf-8',
            },
        )

        const url =
            URL.createObjectURL(blob)

        const link =
            document.createElement('a')

        link.href = url
        link.download =
            'questions-sample.json'

        link.click()

        URL.revokeObjectURL(url)
    }

    const reset = () => {
        onResetQuestions()

        setText(
            JSON.stringify(
                defaultQuestions,
                null,
                2,
            ),
        )

        setMessage({
            type: 'success',
            text: 'Đã khôi phục ngân hàng mẫu ban đầu.',
        })
    }

    return (
        <div className="space-y-5">

            <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
          Admin / Importer
        </span>

                <h1 className="mt-1 text-2xl font-bold text-slate-900">
                    Quản lý dữ liệu câu hỏi
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                    Dán JSON mới để thay thế ngân hàng câu hỏi mà không cần sửa source code.
                </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1fr_320px]">

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft sm:p-6">

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                        <div className="inline-flex items-center gap-2 font-bold text-slate-900">
                            <FileJson
                                size={19}
                                className="text-blue-600"
                            />
                            JSON câu hỏi
                        </div>

                        <button
                            onClick={downloadSample}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50"
                        >
                            <Download size={16} />
                            Tải JSON mẫu
                        </button>

                    </div>

                    <textarea
                        value={text}
                        onChange={(e) =>
                            setText(e.target.value)
                        }
                        spellCheck={false}
                        className="mt-4 min-h-[520px] w-full rounded-xl border border-slate-300 bg-slate-950 p-4 font-mono text-xs leading-6 text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />

                    {message && (
                        <div
                            className={`mt-4 flex items-start gap-2 rounded-xl border p-3 text-sm ${
                                message.type ===
                                'success'
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                    : 'border-rose-200 bg-rose-50 text-rose-800'
                            }`}
                        >
                            {message.type === 'success' ? (
                                <CheckCircle2 size={18} />
                            ) : (
                                <AlertCircle size={18} />
                            )}

                            <span>
                {message.text}
              </span>
                        </div>
                    )}

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">

                        <button
                            onClick={importData}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700"
                        >
                            <Upload size={17} />
                            Cập nhật ngân hàng câu hỏi
                        </button>

                        <button
                            onClick={reset}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium hover:bg-slate-50"
                        >
                            <RotateCcw size={17} />
                            Khôi phục mẫu
                        </button>

                    </div>
                </section>

                <aside className="h-fit space-y-4">

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">

                        <h2 className="font-bold">
                            Quy tắc dữ liệu
                        </h2>

                        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">

                            <li>
                                <strong>id:</strong> số nguyên duy nhất.
                            </li>

                            <li>
                                <strong>chapter:</strong> số chương.
                            </li>

                            <li>
                                <strong>options:</strong> mảng đáp án.
                            </li>

                            <li>
                                <strong>answer:</strong> index bắt đầu từ 0.
                            </li>

                            <li>
                                <strong>explanation:</strong> lời giải chi tiết.
                            </li>

                        </ul>
                    </div>

                    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-sm leading-6 text-blue-900">
                        <strong>Hiện tại:</strong>{' '}
                        {questions.length} câu hỏi đã được tải.
                        Dữ liệu import được ưu tiên từ
                        LocalStorage trong trình duyệt này.
                    </div>

                </aside>
            </div>
        </div>
    )
}