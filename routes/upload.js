const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

const requireAuth = (req, res, next) => {
  if (!req.session.userNo) {
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
  }
  next();
};

// Step1 - 시나리오 초안 생성
router.post('/step1', requireAuth, async (req, res, next) => {
  try {
    const { title, playerCount } = req.body;

    const { data, error } = await supabase
      .from('scenarios')
      .insert([{
        title,
        player_count: playerCount,
        author_no: req.session.userNo,
        status: 'DRAFT',
      }])
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data: { scenarioId: data.scenario_id } });
  } catch (err) {
    next(err);
  }
});

// Step2 - 방 저장
router.post('/step2', requireAuth, async (req, res, next) => {
  try {
    const { scenarioId, rooms } = req.body;

    // 기존 방 삭제 후 재저장
    await supabase.from('rooms').delete().eq('scenario_id', scenarioId);

const { error } = await supabase
  .from('rooms')
  .insert(rooms.map((r) => ({
    scenario_id: scenarioId,
    name: r.name,
    description: r.desc,
    creation_method: r.method,
  })));

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Step3 - 캐릭터 저장
router.post('/step3', requireAuth, async (req, res, next) => {
  try {
    const { scenarioId, characters } = req.body;

    await supabase.from('characters').delete().eq('scenario_id', scenarioId);

const { error } = await supabase
  .from('characters')
  .insert(characters.map((c) => ({
    scenario_id: scenarioId,
    name: c.name,
    public_desc: c.publicDesc,
    private_role: c.privateRole,
    timeline: JSON.stringify(c.timeline),
    victory_cond: c.victoryCondition,
    is_culprit: c.isCulprit,
  })));

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Step4 - 줄거리 + 진상 저장 + 출간
router.post('/step4', requireAuth, async (req, res, next) => {
  try {
    const { scenarioId, synopsis, truths } = req.body;

    // 시나리오 업데이트
    await supabase
      .from('scenarios')
      .update({ summary: synopsis, status: 'PUBLISHED' })
      .eq('scenario_id', scenarioId);

    // 진상 저장
    await supabase.from('truths').delete().eq('scenario_id', scenarioId);

const { error } = await supabase
  .from('truths')
  .insert(truths.map((t) => ({
    scenario_id: scenarioId,
    title: t.title,
    content: t.content,
  })));

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// 내 DRAFT 조회
router.get('/draft', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('scenarios')
      .select(`
        scenario_id, title, player_count, status,
        rooms ( room_id, name, description, creation_method ),
        characters ( character_id, name, public_desc, private_role, timeline, victory_cond, is_culprit ),
        truths ( truth_id, title, content )
      `)
      .eq('author_no', req.session.userNo)
      .eq('status', 'DRAFT')
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      return res.json({ success: true, data: null });
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// DRAFT 삭제 (새로 작성 선택 시)
router.delete('/draft/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    await supabase.from('scenarios').delete().eq('scenario_id', id).eq('author_no', req.session.userNo);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;