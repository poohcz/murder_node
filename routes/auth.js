// routes/auth.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const supabase = require('../supabaseClient');
const ErrorCodes = require('../constants/errorCodes');

const upload = multer();

// 회원가입
router.post('/signup/', upload.none(), async (req, res, next) => {
  const { userId, userPw, userName, email } = req.body;

  try {
    const { data, error } = await supabase
      .from('users')
      .insert([{ user_id: userId, user_pw: userPw, user_name: userName, email: email }])
      .select();

    if (error) {
      if (error.code === '23505') return next(ErrorCodes.DUPLICATE_USER_ID);
      return next({ status: 400, message: error.message });
    }

    res.status(201).json({
      isSuccess: true,
      message: "환영합니다, 탐정님!",
      userNo: data[0].user_no,
      createdAt: data[0].created_at
    });
  } catch (err) {
    next(err); // errorHandler 미들웨어로 양도
  }
});

// 로그인
router.post('/login/', async (req, res, next) => {
  const { username, password } = req.body;

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', username)
      .eq('user_pw', password)
      .single();

    if (error || !user) return next(ErrorCodes.UNAUTHORIZED);

    req.session.userNo = user.user_no;
    req.session.userId = user.user_id;

    res.json({ isSuccess: true, message: "로그인 성공", user: { username: user.user_id, userName: user.user_name } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;