import { createClient } from '@supabase/supabase-js'

// Chỉ dùng phần Auth. Publishable key công khai theo thiết kế: bảng public đã bị thu hồi quyền anon/authenticated
// (migration 002) + RLS, mọi dữ liệu đi qua backend. Thiếu biến → null, app chạy như cũ không có đăng nhập.
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = url && key ? createClient(url, key) : null
