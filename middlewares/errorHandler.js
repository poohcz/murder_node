const ErrorCodes = require('../constants/errorCodes');

const errorHandler = (err, req, res, next) => {
  console.error("❌ [SERVER ERROR]:", err);

  if (err.status && err.message) {
    return res.status(err.status).json({
      success: err.success ?? false,
      message: err.message
    });
  }

  res.status(500).json(ErrorCodes.INTERNAL_SERVER_ERROR);
};

module.exports = errorHandler;