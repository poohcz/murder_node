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

// 유저 대화명 존재 여부 확인
router.post('/check-user', async (req, res, next) => {
  try {
    const { nickname } = req.body;
    const { data, error } = await supabase
      .from('users')
      .select('user_no') // 👈 수정됨 (userNo -> user_no)
      .eq('user_name', nickname) // 👈 수정됨 (userName -> user_name)
      .maybeSingle();

    if (error || !data) {
      return res.json({ success: true, data: { exists: false } });
    }
    
    res.json({ success: true, data: { exists: true, user_no: data.user_no } });
  } catch (err) {
    next(err);
  }
});

// 예약된 시간대 목록 반환
router.get('/booked-slots', async (req, res, next) => {
  try {
    const { scenarioId, date } = req.query;
    
    // 한국 시간(KST) 기준 해당 날짜의 시작과 끝
    const startOfDay = `${date}T00:00:00+09:00`;
    const endOfDay = `${date}T23:59:59+09:00`;

    const { data, error } = await supabase
      .from('game_sessions')
      .select('start_time')
      .eq('scenario_id', scenarioId)
      .gte('start_time', startOfDay)
      .lte('start_time', endOfDay);

    if (error || !data) {
      return res.json({ success: true, data: { bookedTimes: [] } });
    }

    // DB의 '2026-05-20T14:30:00' 데이터를 '14:30' 문자열 배열로 변환
    const bookedTimes = data.map(session => {
      const dateObj = new Date(session.start_time);
      const hh = String(dateObj.getHours()).padStart(2, '0');
      const mm = String(dateObj.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    });
    
    res.json({ success: true, data: { bookedTimes } });
  } catch (err) {
    next(err);
  }
});

// 시나리오 필수 인원 및 제목 조회
router.get('/scenario-info', async (req, res, next) => {
  try {
    const { scenarioId } = req.query;
    console.log('scenarioId:', scenarioId);
    
    const { data, error } = await supabase
      .from('scenarios')
      .select('player_count, title')
      .eq('scenario_id', scenarioId)
      .single();

    console.log('data:', data, 'error:', error);

    if (error || !data) {
      return res.json({ success: true, data: { playerCount: 6, title: '미확인 사건' } });
    }

    res.json({ success: true, data: { playerCount: data.player_count, title: data.title } });
  } catch (err) {
    next(err);
  }
});

router.get('/upcoming-slots', async (req, res, next) => {
  try {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('game_sessions')
      .select(`
        session_id,
        start_time,
        status,
        max_players,
        scenario_id,
        scenarios ( title, thumbnail, difficulty )
      `)
      .gte('start_time', now)
      .eq('status', 'WAITING')
      .order('start_time', { ascending: true })
      .limit(4);

    if (error) throw error;

    const slots = data.map(s => ({
      sessionId: s.session_id,
      startTime: s.start_time,
      displayTime: new Date(s.start_time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
      maxPlayers: s.max_players,
      scenarioId: s.scenario_id,
      title: s.scenarios?.title,
      thumbnail: s.scenarios?.thumbnail,
      difficulty: s.scenarios?.difficulty,
    }));

    res.json({ success: true, data: { slots } });
  } catch (err) {
    next(err);
  }
});

// 방 개설 (중복 체크 및 참여자 등록)
router.post('/create-room', async (req, res, next) => {
  try {
    const { scenarioId, date, time, hostNo, invitedUsers, maxPlayers } = req.body;
    const startTime = `${date}T${time}:00+09:00`; // KST

    // 1. 찰나의 순간 중복 예약 체크
    const { data: existing } = await supabase
      .from('game_sessions')
      .select('session_id')
      .eq('scenario_id', scenarioId)
      .eq('start_time', startTime)
      .single();

    if (existing) {
      return res.json({ success: false, message: '찰나의 순간! 이미 다른 탐정이 예약한 시간입니다.' });
    }

    // 2. 방 생성 (game_sessions)
    const { data: session, error: sessionErr } = await supabase
      .from('game_sessions')
      .insert([{ scenario_id: scenarioId, host_no: hostNo, start_time: startTime, status: 'WAITING', max_players: maxPlayers }])
      .select().single();

    if (sessionErr) throw sessionErr;

    // 3. 참여자 등록 (game_participants)
    const { data: users } = await supabase
      .from('users')
      .select('user_no, user_name')
      .in('user_name', invitedUsers);

    const participants = users.map(u => ({
      session_id: session.session_id,
      user_no: u.user_no,
      is_ready: false
    }));

    await supabase.from('game_participants').insert(participants);

    res.json({ success: true, sessionId: session.session_id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;