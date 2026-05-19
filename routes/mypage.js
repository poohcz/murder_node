const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

// 인증 미들웨어
const requireAuth = (req, res, next) => {
  if (!req.session.userNo) {
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
  }
  next();
};

// 게임 기록 (완료 + 예정)
router.get('/rooms', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('game_participants')
      .select(`
        session_id, role, is_winner, my_rating,
        game_sessions (
          session_id, status, start_time, end_time,
          scenarios ( scenario_id, title, thumbnail, summary )
        )
      `)
      .eq('user_no', req.session.userNo);

    if (error) throw error;

    const rooms = data.map(p => ({
      id: p.session_id,
      title: p.game_sessions?.scenarios?.title,
      thumbnail: p.game_sessions?.scenarios?.thumbnail,
      summary: p.game_sessions?.scenarios?.summary,
      status: p.game_sessions?.status,
      startTime: p.game_sessions?.start_time,
      role: p.role,
      isWinner: p.is_winner,
      myRating: p.my_rating,
    }));

    res.json({ success: true, data: rooms });
  } catch (err) {
    next(err);
  }
});

// 찜 목록
router.get('/wishlist', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('wishlists')
      .select(`
        wish_id,
        scenarios ( scenario_id, title, thumbnail, difficulty, player_count, price )
      `)
      .eq('user_no', req.session.userNo);

    if (error) throw error;

    res.json({
      success: true,
      data: data.map(w => ({
        id: w.scenarios?.scenario_id,
        title: w.scenarios?.title,
        thumbnail: w.scenarios?.thumbnail,
        difficulty: w.scenarios?.difficulty,
        players: w.scenarios?.player_count,
        price: `${w.scenarios?.price?.toLocaleString()}P`,
      }))
    });
  } catch (err) {
    next(err);
  }
});

// 내가 올린 시나리오
router.get('/uploads', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('scenarios')
      .select('scenario_id, title, thumbnail, genre, play_count, rating, price')
      .eq('author_no', req.session.userNo);

    if (error) throw error;

    res.json({
      success: true,
      data: data.map(s => ({
        id: s.scenario_id,
        title: s.title,
        thumbnail: s.thumbnail,
        genre: s.genre,
        plays: s.play_count,
        rating: s.rating,
        revenue: (s.price * s.play_count).toLocaleString(),
      }))
    });
  } catch (err) {
    next(err);
  }
});

// 업적
router.get('/achievements', requireAuth, async (req, res, next) => {
  try {
    const { data: allAchievements, error: achError } = await supabase
      .from('achievements')
      .select('achievement_id, name, description');

    const { data: userAchievements, error: userAchError } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_no', req.session.userNo);

    if (achError || userAchError) throw achError || userAchError;

    const achievedIds = new Set(userAchievements.map(a => a.achievement_id));

    res.json({
      success: true,
      data: allAchievements.map(a => ({
        id: a.achievement_id,
        name: a.name,
        achieved: achievedIds.has(a.achievement_id),
      }))
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;