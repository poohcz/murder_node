// constants/errorCodes.js
const ErrorCodes = {
  // 400 Bad Request
  BAD_REQUEST: { status: 400, isSuccess: false, message: "잘못된 요청입니다." },
  DUPLICATE_USER_ID: { status: 400, isSuccess: false, message: "이미 존재하는 아이디입니다." },
  
  // 401 Unauthorized
  UNAUTHORIZED: { status: 401, isSuccess: false, message: "아이디 또는 비밀번호가 잘못되었습니다." },
  LOGIN_REQUIRED: { status: 401, isSuccess: false, message: "로그인이 필요한 서비스입니다." },

  // 404 Not Found
  NOT_FOUND: { status: 404, isSuccess: false, message: "요청하신 데이터를 찾을 수 없습니다." },

  // 500 Internal Server Error
  INTERNAL_SERVER_ERROR: { status: 500, isSuccess: false, message: "서버 내부 에러가 발생했습니다." }
};

// 변경 불가능하도록 동결(Freeze) 처리하여 싱글톤 규격 유지
Object.freeze(ErrorCodes);

module.exports = ErrorCodes;