// Định danh ổn định cho một câu hỏi trong ngân hàng tĩnh.
// `id` trong questions.json chỉ duy nhất TRONG một chương (mỗi chương đánh số lại từ 1),
// nên khoá phải gồm môn + chương + id. Không có trường `subject` trong JSON → mặc định môn của ngân hàng hiện tại.
export const DEFAULT_SUBJECT = 'CNSAI'

export function questionKey(question) {
    return `${question.subject ?? DEFAULT_SUBJECT}:c${question.chapter}:q${question.id}`
}

// Chuyển danh sách id cũ (bookmark/tiến độ lưu bằng `id` trần) sang khoá mới.
// Chỉ chuyển id khớp DUY NHẤT một câu trong ngân hàng hiện tại; id mơ hồ (khớp nhiều chương)
// không được đoán – dữ liệu gốc vẫn nằm nguyên ở key localStorage cũ.
export function migrateLegacyIds(legacyIds, questions) {
    if (!Array.isArray(legacyIds) || !Array.isArray(questions)) return []

    const keysById = new Map()
    for (const q of questions) {
        const id = String(q.id)
        keysById.set(id, [...(keysById.get(id) ?? []), questionKey(q)])
    }

    const migrated = []
    for (const id of legacyIds) {
        const keys = keysById.get(String(id))
        if (keys?.length === 1 && !migrated.includes(keys[0])) migrated.push(keys[0])
    }
    return migrated
}
