const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('scenarios')
      .select('scenario_id, title, player_count, difficulty, thumbnail, rating')
      .gte('rating', 4.0)
      .order('rating', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: data.map(s => ({
        id: s.scenario_id,            // 🌟 프론트가 쓰는 이름으로 변경!
        title: s.title,
        players: s.player_count,      // 🌟 여기도 변경!
        difficulty: s.difficulty,
        thumbnail: s.thumbnail,
        rating: String(s.rating)      // scenarios.js와 동일하게 문자열 처리
      }))
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;