// routes/main.js
const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

router.get('/', async (req, res, next) => {
  try {
    const { data: banners } = await supabase
      .from('banners')
      .select('banner_id, title, desc, thumbnail')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    const { data: topRated } = await supabase
      .from('scenarios')
      .select('scenario_id, title, rating, thumbnail')
      .gte('rating', 4.0)
      .order('rating', { ascending: false })
      .limit(3);

    const { data: generalList } = await supabase
      .from('scenarios')
      .select('scenario_id, title, player_count, difficulty, thumbnail');

    res.json({
      banners: banners?.map(b => ({ id: b.banner_id, title: b.title, desc: b.desc, thumbnail: b.thumbnail })) || [],
      topRated: topRated?.map(t => ({ id: t.scenario_id, title: t.title, rating: String(t.rating), thumbnail: t.thumbnail })) || [],
      generalList: generalList?.map(g => ({ id: g.scenario_id, title: g.title, players: g.player_count, difficulty: g.difficulty, thumbnail: g.thumbnail })) || []
    });
  } catch (err) {
    next(err); // 에러 터지면 미들웨어가 500 에러 자동 반환
  }
});

module.exports = router;