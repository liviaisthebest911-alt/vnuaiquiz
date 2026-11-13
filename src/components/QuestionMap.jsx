// Lưới "Danh sách câu" dùng chung cho Ôn tập (cục bộ và máy chủ). Chỉ hiển thị + nhảy câu, không đổi dữ liệu.
export default function QuestionMap({ id, items, current, onSelect, showMarked = false }) {
    return (
        <div id={id} className="space-y-4">
            <div className="qmap-scroll" tabIndex={0} role="region" aria-label="Cuộn danh sách câu hỏi">
                <div className="qmap-grid">
                    {items.map((item, index) => (
                        <button key={item.key} type="button"
                                aria-current={index === current ? 'step' : undefined}
                                data-answered={Boolean(item.answered)} data-marked={Boolean(item.marked)}
                                onClick={() => onSelect(index)}>
                            {index + 1}
                        </button>
                    ))}
                </div>
            </div>
            <ul className="qmap-legend">
                <li><i style={{ background: 'rgb(var(--c-cta))' }} />Đang làm</li>
                <li><i style={{ background: 'rgb(var(--c-soft))', border: '1px solid rgb(var(--c-sky))' }} />Đã làm</li>
                {showMarked && <li><i style={{ boxShadow: 'inset 0 0 0 2px rgb(var(--c-petal))' }} />Đã đánh dấu</li>}
            </ul>
        </div>
    )
}
