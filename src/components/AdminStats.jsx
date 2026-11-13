import { useStudyData } from '../hooks/useStudyData'
import { card, muted, primary } from './ui'

const contentNames = { subjects: 'Môn học', materials: 'Tài liệu', questions: 'Câu hỏi', exams: 'Đề thi' }
const statusNames = { draft: 'Nháp', in_review: 'Chờ duyệt', published: 'Đã xuất bản', hidden: 'Đã ẩn', archived: 'Đã lưu trữ' }

export default function AdminStats({ session, onSignIn }) {
    const stats = useStudyData(session ? '/admin/stats' : null, session?.user.id)
    const data = stats.data
    return (
        <div className="study-page">
            <h1>Thống kê quản trị</h1>
            {session === null && <button type="button" className={primary} onClick={onSignIn}>Đăng nhập</button>}
            {(session === undefined || stats.loading) && <p role="status" className="study-empty">Đang tải thống kê…</p>}
            {stats.error && <p role="alert" className="study-alert">{stats.error.message} <button type="button" onClick={stats.reload}>Thử lại</button></p>}
            {data && <>
                <dl className="study-metrics">
                    <div><dt>Tổng tài khoản</dt><dd>{data.users_count}</dd></div>
                    <div><dt>Tài khoản mới trong 7 ngày</dt><dd>{data.new_users_count}</dd></div>
                    <div><dt>Lượt thi đã chốt trong 30 ngày</dt><dd>{data.attempts_by_day.reduce((sum, item) => sum + item.count, 0)}</dd></div>
                </dl>
                <section className={`${card} space-y-3`}>
                    <h2 className="text-xl font-bold">Nội dung theo trạng thái</h2>
                    <dl className="space-y-2">
                        {Object.entries(contentNames).map(([key, name]) => (
                            <div key={key} className="flex flex-wrap justify-between gap-2 border-b border-blossom-border py-2 dark:border-blossom-border-dark">
                                <dt className="font-semibold">{name}</dt>
                                <dd className={muted}>{Object.entries(data.content[key] ?? {}).map(([status, count]) => `${statusNames[status] ?? status} ${count}`).join(' · ') || 'Chưa có'}</dd>
                            </div>
                        ))}
                    </dl>
                </section>
                <div className="study-home-grid">
                    <section className={`${card} space-y-3`}>
                        <h2 className="text-lg font-bold">Lượt thi theo ngày</h2>
                        {data.attempts_by_day.length ? <ul className="study-history">
                            {data.attempts_by_day.map((item) => <li key={item.day}><time dateTime={item.day}>{item.day.split('-').reverse().join('/')}</time><strong>{item.count}</strong></li>)}
                        </ul> : <p className={muted}>Chưa có lượt thi trong 30 ngày qua.</p>}
                    </section>
                    <section className={`${card} space-y-3`}>
                        <h2 className="text-lg font-bold">Tài liệu được lưu nhiều nhất</h2>
                        {data.top_materials.length ? <ul className="study-history">
                            {data.top_materials.map((item) => <li key={item.id}><span>{item.title}</span><strong>{item.count} lượt lưu</strong></li>)}
                        </ul> : <p className={muted}>Chưa có tài liệu được lưu.</p>}
                    </section>
                </div>
            </>}
        </div>
    )
}
