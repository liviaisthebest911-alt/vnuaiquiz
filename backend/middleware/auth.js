// Xác thực: JWT (access token Supabase) chỉ cho biết DANH TÍNH (sub). Vai trò và trạng thái tài khoản
// luôn đọc từ public.users + roles – không bao giờ từ claim (user_metadata/app_metadata) hay request body.
import { createRemoteJWKSet, errors, jwtVerify } from 'jose';
import pool from '../config/db.js';
import { HttpError } from './errors.js';

export const ROLE_RANK = { user: 1, editor: 2, admin: 3 };
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TOKEN_ERRORS = new Set([
  'ERR_JWS_INVALID', 'ERR_JWT_INVALID', 'ERR_JWT_EXPIRED', 'ERR_JWT_CLAIM_VALIDATION_FAILED',
  'ERR_JOSE_ALG_NOT_ALLOWED', 'ERR_JOSE_NOT_SUPPORTED', 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED',
  'ERR_JWKS_NO_MATCHING_KEY', 'ERR_JWKS_MULTIPLE_MATCHING_KEYS',
]);

const unauthenticated = () => new HttpError(401, 'UNAUTHENTICATED', 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');

let jwks;
let issuer;
function verifier() {
  if (!jwks) {
    const base = process.env.SUPABASE_URL?.replace(/\/+$/, '');
    if (!base) throw new Error('Thiếu SUPABASE_URL');
    issuer = `${base}/auth/v1`;
    // Khoá ký bất đối xứng của project (JWKS được jose cache). Không hỗ trợ HS256 (legacy JWT secret).
    jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
  }
  return jwks;
}

async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, verifier(), {
      issuer, audience: 'authenticated', algorithms: ['ES256', 'RS256'], requiredClaims: ['sub', 'exp'],
    });
    return payload;
  } catch (err) {
    // Chỉ lỗi do chính token → 401. JWKS lỗi/không tải được (non-200, timeout, mạng) → 500, không đổ cho người dùng.
    if (err instanceof errors.JOSEError && TOKEN_ERRORS.has(err.code)) throw unauthenticated();
    throw err;
  }
}

export async function requireAuth(req, res, next) {
  const token = /^Bearer\s+(\S+)$/i.exec(req.get('authorization') ?? '')?.[1];
  if (!token) throw new HttpError(401, 'UNAUTHENTICATED', 'Cần đăng nhập.');

  const claims = await verifyToken(token);
  // Phiên ẩn danh (anonymous sign-in) không có profile; sub phải là UUID trước khi đưa vào truy vấn.
  if (claims.is_anonymous === true || !UUID.test(claims.sub)) throw unauthenticated();

  const { rows } = await pool.query(
    `select u.id, u.email, u.full_name, u.student_code, u.status, r.code as role, u.created_at
       from public.users u join public.roles r on r.id = u.role_id where u.id = $1`,
    [claims.sub],
  );
  const user = rows[0];
  if (!user) throw unauthenticated();   // tài khoản đã bị xoá nhưng token cũ còn hạn
  if (user.status !== 'active') throw new HttpError(403, 'ACCOUNT_BLOCKED', 'Tài khoản đã bị khoá.');
  req.user = user;
  next();
}

// Khách (không header Authorization) → req.user = null. Có header nhưng sai/khoá → lỗi như requireAuth,
// không âm thầm hạ xuống khách (tránh che lỗi phiên hết hạn).
export function optionalAuth(req, res, next) {
  if (req.get('authorization') === undefined) {
    req.user = null;
    return next();
  }
  return requireAuth(req, res, next);
}

// Dùng sau requireAuth. Vai trò cao hơn có mọi quyền của vai trò thấp hơn.
export const hasRole = (user, role) => ROLE_RANK[user?.role] >= ROLE_RANK[role];

export const requireRole = (role) => (req, res, next) => {
  if (!hasRole(req.user, role)) throw new HttpError(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.');
  next();
};
