// routes/topscore.js
const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

// [GET] /api/topscore/ - 평점 4.0 이상 시나리오 가져오기
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('scenarios')
      .select('scenario_id, title, player_count, difficulty, thumbnail, rating')
      .gte('rating', 4.0)
      .order('rating', { ascending: false }); // 평점 높은 순 정렬

    if (error) throw error;

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;