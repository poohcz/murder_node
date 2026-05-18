// middlewares/errorHandler.js
const ErrorCodes = require('../constants/errorCodes');

const errorHandler = (err, req, res, next) => {
  console.error("❌ [SERVER ERROR]:", err);

  // 우리가 정의한 ErrorCodes 규격에 맞는 에러인 경우
  if (err.status && err.message) {
    return res.status(err.status).json({
      isSuccess: err.isSuccess ?? false,
      message: err.message
    });
  }

  // 그 외의 예측하지 못한 런타임 에러 처리
  res.status(500).json(ErrorCodes.INTERNAL_SERVER_ERROR);
};

module.exports = errorHandler;