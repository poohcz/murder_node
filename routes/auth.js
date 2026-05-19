const express = require('express');
const router = express.Router();
const multer = require('multer');
const bcrypt = require('bcrypt');
const supabase = require('../supabaseClient');
const ErrorCodes = require('../constants/errorCodes');

const upload = multer();

// 회원가입
router.post('/signup/', upload.none(), async (req, res, next) => {
  const { username, password, birth_year, gender } = req.body;

  if (!username || !password) {
    return next({ status: 400, message: '필수 항목이 누락되었습니다.' });
  }

  try {
    const hashedPw = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('users')
      .insert([{ user_id: username, user_pw: hashedPw, user_name: username }])
      .select();

    if (error) {
      if (error.code === '23505') return next(ErrorCodes.DUPLICATE_USER_ID);
      return next({ status: 400, message: error.message });
    }

    const userNo = data[0].user_no;

    await supabase
      .from('profile')
      .insert([{ user_no: userNo, birth_year: birth_year ? parseInt(birth_year) : null, gender }]);

    req.session.userNo = userNo;
    req.session.userId = username;

    res.status(201).json({
      success: true,
      message: '환영합니다, 탐정님!',
      user: { username, userName: username }
    });
  } catch (err) {
    next(err);
  }
});

// 로그인
router.post('/login/', async (req, res, next) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return next({ status: 400, message: '아이디 또는 비밀번호를 입력해주세요.' });
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', username)
      .single();

    if (error || !user) return next(ErrorCodes.UNAUTHORIZED);

    const isMatch = await bcrypt.compare(password, user.user_pw);
    if (!isMatch) return next(ErrorCodes.UNAUTHORIZED);

    req.session.userNo = user.user_no;
    req.session.userId = user.user_id;

    res.json({
      success: true,
      message: '로그인 성공',
      user: {
        username: user.user_id,
        userName: user.user_name
      }
    });
  } catch (err) {
    next(err);
  }
});

// 로그아웃
router.post('/logout/', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('connect.sid');
    res.json({ success: true, message: '로그아웃 되었습니다.' });
  });
});

// 내 정보 조회 (세션 확인용)
router.get('/me/', async (req, res, next) => {
  if (!req.session.userNo) {
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('user_no, user_id, user_name, email, current_level, reward_points, created_at')
      .eq('user_no', req.session.userNo)
      .single();

    if (error || !user) return next(ErrorCodes.UNAUTHORIZED);

    res.json({
      success: true,
      data: {
        id: user.user_no,
        username: user.user_id,
        userName: user.user_name,
        email: user.email,
        level: user.current_level,
        points: user.reward_points,
      }
    });
  } catch (err) {
    next(err);
  }
});

// 닉네임 중복 확인
router.get('/check-username/', async (req, res, next) => {
  const { username } = req.query;

  if (!username) {
    return next({ status: 400, message: 'username이 필요합니다.' });
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('user_id')
      .eq('user_id', username)
      .single();

    res.json({ isAvailable: !data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;