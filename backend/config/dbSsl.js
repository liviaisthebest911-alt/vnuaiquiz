const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

// Lỗi của new URL() mang theo cả chuỗi kết nối (có mật khẩu) → thay bằng thông báo không chứa input.
function parse(url) {
  try {
    return new URL(url);
  } catch {
    throw new Error('DATABASE_URL không hợp lệ (mật khẩu có ký tự đặc biệt phải được URL-encode)');
  }
}

// pg cho phép ?host=... ghi đè hostname → chỉ coi là cục bộ khi không có tham số đó.
export const isLocalDatabase = (url) => {
  const u = parse(url);
  return LOCAL_HOSTS.has(u.hostname) && !u.searchParams.has('host');
};

export const databaseHost = (url) => {
  const u = parse(url);
  return u.searchParams.get('host') ?? u.hostname;
};

// TLS có kiểm tra chứng chỉ cho DB từ xa. Supabase ký bằng CA riêng → DATABASE_CA_CERT (PEM, Dashboard → Database → SSL).
// Postgres cục bộ (docker/CI) không có TLS.
export function dbSsl(url, caCert = process.env.DATABASE_CA_CERT) {
  if (isLocalDatabase(url)) return false;
  const params = parse(url).searchParams;
  // pg để sslmode/ssl trong URL ghi đè cấu hình dưới đây – có thể âm thầm tắt kiểm tra chứng chỉ
  if (['sslmode', 'ssl', 'sslrootcert', 'uselibpqcompat'].some((p) => params.has(p))) {
    throw new Error('Bỏ sslmode/ssl khỏi DATABASE_URL: TLS được cấu hình qua DATABASE_CA_CERT');
  }
  return { rejectUnauthorized: true, ...(caCert && { ca: caCert.replace(/\\n/g, '\n') }) };
}
