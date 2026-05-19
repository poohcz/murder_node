const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

router.get('/', async (req, res, next) => {
  try {
    const { data: banners, error: bannerError } = await supabase
      .from('banners')
      .select('banner_id, scenario_id, title, desc, thumbnail')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    const { data: topRated, error: topRatedError } = await supabase
      .from('scenarios')
      .select('scenario_id, title, rating, thumbnail')
      .gte('rating', 4.0)
      .order('rating', { ascending: false })
      .limit(3);

    const { data: generalList, error: generalError } = await supabase
      .from('scenarios')
      .select('scenario_id, title, player_count, difficulty, thumbnail');

    if (bannerError || topRatedError || generalError) {
       throw bannerError || topRatedError || generalError;
    }

    // 🌟 성공 규격 껍질(success, data)을 씌워서 하나로 묶어줍니다!
    res.json({
      success: true,
      data: {
        banners: banners?.map(b => ({ id: b.scenario_id, title: b.title, desc: b.desc, thumbnail: b.thumbnail })) || [],
        topRated: topRated?.map(t => ({ id: t.scenario_id, title: t.title, rating: String(t.rating), thumbnail: t.thumbnail })) || [],
        generalList: generalList?.map(g => ({ id: g.scenario_id, title: g.title, players: g.player_count, difficulty: g.difficulty, thumbnail: g.thumbnail })) || []
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;