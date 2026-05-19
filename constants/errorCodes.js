// constants/errorCodes.js
const ErrorCodes = {
  BAD_REQUEST: { status: 400, success: false, message: "잘못된 요청입니다." },
  DUPLICATE_USER_ID: { status: 400, success: false, message: "이미 존재하는 아이디입니다." },
  UNAUTHORIZED: { status: 401, success: false, message: "아이디 또는 비밀번호가 잘못되었습니다." },
  LOGIN_REQUIRED: { status: 401, success: false, message: "로그인이 필요한 서비스입니다." },
  NOT_FOUND: { status: 404, success: false, message: "요청하신 데이터를 찾을 수 없습니다." },
  INTERNAL_SERVER_ERROR: { status: 500, success: false, message: "서버 내부 에러가 발생했습니다." }
};

Object.freeze(ErrorCodes);
module.exports = ErrorCodes;