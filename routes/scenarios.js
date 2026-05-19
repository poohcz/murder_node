// routes/scenarios.js
const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

// [GET] /api/scenarios/ - 모든 시나리오 최신순으로 가져오기
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('scenarios')
      .select('scenario_id, title, player_count, difficulty, thumbnail, rating, genre')
      .order('uploaded_at', { ascending: false }); // 최신 등록순 정렬

    // 에러 발생 시 공통 에러 핸들러로 패스
    if (error) throw error; 

    // 🌟 성공 규격(success, data) + 프론트엔드가 원하는 이름으로 완벽 매핑!
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

// [GET] /api/scenarios/:id - 특정 시나리오 1개 상세 조회
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params; // 🌟 프론트엔드가 주소창에 실어 보낸 고유 ID를 쏙 빼옵니다.

    const { data, error } = await supabase
      .from('scenarios')
      .select('scenario_id, title, player_count, difficulty, thumbnail, rating, genre, summary, price, play_time')
      .eq('scenario_id', id)
      .single(); // 🌟 단 1개의 데이터만 가져올 때 쓰는 Supabase 무기! (배열이 아닌 객체로 반환됨)

    if (error) {
      // 만약 잘못된 ID를 넣어서 데이터를 못 찾았다면 404 에러로 패스
      if (error.code === 'PGRST116') {
        return res.status(404).json({ success: false, message: '존재하지 않는 시나리오입니다.' });
      }
      throw error;
    }

    // 우리의 무적 표준 규격으로 리턴! (배열 .map이 아니라 단일 객체입니다)
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

module.exports = router;