// Xử lý lỗi tập trung: mọi lỗi trả về { error: { code, message, details? } }.
// Chi tiết (stack, message gốc) chỉ ghi vào log server, không bao giờ vào response –
// trừ khi bật debug một cách TƯỜNG MINH ở máy dev (xem debugDetailsAllowed).

export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const validationError = (message, details) =>
  new HttpError(422, 'VALIDATION_ERROR', message, details);

// Lỗi do body-parser (express.json) ném ra – phân loại theo err.type, dùng message của ta.
const BODY_ERRORS = {
  'entity.parse.failed': [400, 'INVALID_JSON', 'Dữ liệu JSON không hợp lệ.'],
  'entity.too.large': [413, 'PAYLOAD_TOO_LARGE', 'Dữ liệu gửi lên quá lớn.'],
  'parameters.too.many': [413, 'PAYLOAD_TOO_LARGE', 'Dữ liệu gửi lên quá lớn.'],
  'encoding.unsupported': [415, 'UNSUPPORTED_ENCODING', 'Kiểu mã hoá không được hỗ trợ.'],
  'charset.unsupported': [415, 'UNSUPPORTED_ENCODING', 'Kiểu mã hoá không được hỗ trợ.'],
};

// Debug chỉ bật khi cả hai biến được đặt rõ ràng và không chạy trên Vercel (preview/production).
// NODE_ENV thiếu hoặc sai → coi như production.
export function debugDetailsAllowed(env = process.env) {
  return env.DEBUG_ERRORS === 'true' && env.NODE_ENV === 'development' && !env.VERCEL;
}

export function notFound(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy đường dẫn.' } });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  let status = 500;
  let code = 'INTERNAL';
  let message = 'Đã xảy ra lỗi trên server.';
  let details;

  if (err instanceof HttpError) {
    ({ status, code, message, details } = err);
  } else if (BODY_ERRORS[err?.type]) {
    [status, code, message] = BODY_ERRORS[err.type];
  } else if (err?.type && err.status >= 400 && err.status < 500) {
    [status, code, message] = [err.status, 'BAD_REQUEST', 'Yêu cầu không hợp lệ.'];
  }

  if (status >= 500) {
    console.error(`[${status}] ${req.method} ${req.originalUrl} ${code}`, err);
  } else {
    console.warn(`[${status}] ${req.method} ${req.originalUrl} ${code}: ${err?.message}`);
  }

  const body = { error: { code, message } };
  if (details !== undefined) body.error.details = details;
  if (status >= 500 && debugDetailsAllowed()) body.error.debug = { message: err?.message, stack: err?.stack };

  res.status(status).json(body);
}
