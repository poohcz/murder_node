const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

const requireAuth = (req, res, next) => {
  if (!req.session.userNo) {
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
  }
  next();
};

// 모든 시나리오
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('scenarios')
      .select('scenario_id, title, player_count, difficulty, thumbnail, rating, genre')
      .order('uploaded_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: data.map(s => ({
        id: s.scenario_id,
        title: s.title,
        players: s.player_count,
        difficulty: s.difficulty,
        thumbnail: s.thumbnail,
        rating: String(s.rating),
        genre: s.genre,
      }))
    });
  } catch (err) {
    next(err);
  }
});

// 시나리오 상세
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('scenarios')
      .select('scenario_id, title, player_count, difficulty, thumbnail, rating, genre, summary, price, play_time')
      .eq('scenario_id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ success: false, message: '존재하지 않는 시나리오입니다.' });
      }
      throw error;
    }

    res.json({
      success: true,
      data: {
        id: data.scenario_id,
        title: data.title,
        players: data.player_count,
        difficulty: data.difficulty,
        thumbnail: data.thumbnail,
        rating: String(data.rating),
        genre: data.genre,
        description: data.summary || '이 사건에 대한 구체적인 브리핑 기록이 없습니다.',
        price: data.price,
        play_time: data.play_time,
      }
    });
  } catch (err) {
    next(err);
  }
});

// 구매 여부 확인
router.get('/:id/purchased', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('user_scenarios')
      .select('purchase_id')  // id → purchase_id
      .eq('user_no', req.session.userNo)
      .eq('scenario_id', id)
      .maybeSingle();

    console.log('purchased data:', data, 'error:', error);
    res.json({ success: true, isPurchased: !!data });
  } catch (err) {
    next(err);
  }
});

// 구매
router.post('/:id/purchase', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: existing } = await supabase
      .from('user_scenarios')
      .select('purchase_id')  // id → purchase_id
      .eq('user_no', req.session.userNo)
      .eq('scenario_id', id)
      .maybeSingle();

    if (existing) {
      return res.json({ success: true, message: '이미 구매한 시나리오입니다.', isPurchased: true });
    }

    const { error } = await supabase
      .from('user_scenarios')
      .insert([{ user_no: req.session.userNo, scenario_id: id }]);

    if (error) throw error;

    res.json({ success: true, message: '구매 완료!', isPurchased: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;