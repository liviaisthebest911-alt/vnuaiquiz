import mascot from '../assets/mascot.png'

// Ảnh gốc 210×227 do chủ dự án cung cấp, nền #FCFCFC; nhân vật nằm trong vùng 112×112 bắt đầu tại (70, 100).
// Chỉ cắt khung bằng CSS và chỉ thu nhỏ (size ≤ 112) để giữ đúng nhân vật và độ nét – không chỉnh sửa ảnh.
const CROP = 112

// mood: idle | greet | success | encourage | loading → chỉ đổi chuyển động CSS (xem .mascot--* trong workspace.css)
export default function Mascot({ size = 64, mood = 'idle', className = '' }) {
    const scale = Math.min(size, CROP) / CROP
    return (
        <span aria-hidden="true" className={`mascot mascot--${mood} ${className}`} style={{ width: size, height: size }}>
            <img src={mascot} alt="" draggable="false" style={{ width: 210 * scale, left: -70 * scale + (size - CROP * scale) / 2, top: -100 * scale + (size - CROP * scale) / 2 }} />
        </span>
    )
}
