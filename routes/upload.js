const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

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
      .insert([{ title, player_count: playerCount, author_no: req.session.userNo, status: 'DRAFT' }])
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data: { scenarioId: data.scenario_id } });
  } catch (err) {
    next(err);
  }
});

// Step2 - 방 저장 + 장소카드(clues) 저장
router.post('/step2', requireAuth, upload.any(), async (req, res, next) => {
  try {
    const scenarioId = req.body.scenarioId;
    const rooms = JSON.parse(req.body.rooms);

    // 이미지 업로드
    for (let i = 0; i < rooms.length; i++) {
      const file = (req.files || []).find(f => f.fieldname === `room_image_${i}`);
      if (file) {
        const ext = file.originalname.split('.').pop();
        const fileName = `${scenarioId}_room_${i}_${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('scenario-images')
          .upload(fileName, file.buffer, { contentType: file.mimetype });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('scenario-images').getPublicUrl(fileName);
        rooms[i].imageUrl = urlData.publicUrl;
      }
    }

    // rooms 테이블 저장 (맵 좌표용)
    await supabase.from('rooms').delete().eq('scenario_id', scenarioId);
    const { data: savedRooms, error: roomError } = await supabase
      .from('rooms')
      .insert(rooms.map((r) => ({
        scenario_id: scenarioId,
        name: r.name,
        description: r.desc,
        creation_method: r.method,
        image: r.imageUrl || null,
      })))
      .select();
    if (roomError) throw roomError;

    // clues 테이블에 장소카드로 저장
    await supabase.from('clues').delete().eq('scenario_id', scenarioId).eq('type', '장소');
    const { error: clueError } = await supabase.from('clues').insert(
      rooms.map((r, i) => ({
        scenario_id: scenarioId,
        room_id: savedRooms[i].room_id,
        name: r.name,
        type: '장소',
        short_desc: r.desc,
        long_desc: r.desc,
        image: r.imageUrl || null,
        is_public: r.isPublic ?? false,
      }))
    );
    if (clueError) throw clueError;

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Step3 - 캐릭터 저장
router.post('/step3', requireAuth, upload.any(), async (req, res, next) => {
  try {
    const scenarioId = req.body.scenarioId;
    const characters = JSON.parse(req.body.characters);

    for (let i = 0; i < characters.length; i++) {
      const file = (req.files || []).find(f => f.fieldname === `char_image_${i}`);
      if (file) {
        const ext = file.originalname.split('.').pop();
        const fileName = `${scenarioId}_char_${i}_${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('scenario-images')
          .upload(fileName, file.buffer, { contentType: file.mimetype });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('scenario-images').getPublicUrl(fileName);
        characters[i].imageUrl = urlData.publicUrl;
      }
    }

    await supabase.from('characters').delete().eq('scenario_id', scenarioId);
    const { error } = await supabase.from('characters').insert(
      characters.map((c) => ({
        scenario_id: scenarioId,
        name: c.name,
        age: c.age ? parseInt(c.age) : null,
        gender: c.gender || null,
        public_desc: c.publicDesc,
        private_role: c.privateRole,
        timeline: JSON.stringify(c.timeline),
        victory_cond: c.victoryCondition,
        is_culprit: c.isCulprit,
        image: c.imageUrl || null,
      }))
    );
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Step4 - 배경이미지 저장 + 인물카드(clues) 저장
router.post('/step4', requireAuth, upload.any(), async (req, res, next) => {
  try {
    const scenarioId = req.body.scenarioId;
    const pages = typeof req.body.pages === 'string' ? JSON.parse(req.body.pages) : req.body.pages;

    // 1. 공통 배경 이미지 처리
    const bgFile = (req.files || []).find(f => f.fieldname === 'bg_image');
    if (bgFile) {
      const ext = bgFile.originalname.split('.').pop();
      const fileName = `${scenarioId}_bg_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('scenario-images')
        .upload(fileName, bgFile.buffer, { contentType: bgFile.mimetype });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('scenario-images').getPublicUrl(fileName);
      await supabase.from('scenarios').update({ background_image: urlData.publicUrl }).eq('scenario_id', scenarioId);
    }

    // 2. 인물카드 이미지 처리
    for (let i = 0; i < pages.length; i++) {
      const file = (req.files || []).find(f => f.fieldname === `page_image_${i}`);
      if (file) {
        const ext = file.originalname.split('.').pop();
        const fileName = `${scenarioId}_page_${i}_${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('scenario-images')
          .upload(fileName, file.buffer, { contentType: file.mimetype });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('scenario-images').getPublicUrl(fileName);
        pages[i].leftImage = urlData.publicUrl;
      }
    }

    // 3. clues 테이블에 인물카드로 저장
    await supabase.from('clues').delete().eq('scenario_id', scenarioId).eq('type', '인물카드');
    const { error } = await supabase.from('clues').insert(
      pages.map((p) => ({
        scenario_id: scenarioId,
        room_id: null,
        name: p.rightTitle,
        type: '인물카드',
        short_desc: p.rightContent,
        long_desc: p.leftContent || p.rightContent,
        image: p.leftImage || null,
        is_public: p.isPublic ?? false,
      }))
    );
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Step5 - 진상 저장
router.post('/step5', requireAuth, async (req, res, next) => {
  try {
    const { scenarioId, synopsis, truths } = req.body;
    await supabase.from('scenarios').update({ summary: synopsis, status: 'PUBLISHED' }).eq('scenario_id', scenarioId);
    await supabase.from('truths').delete().eq('scenario_id', scenarioId);
    const { error } = await supabase.from('truths').insert(
      truths.map((t) => ({
        scenario_id: scenarioId,
        title: t.title,
        content: t.content,
      }))
    );
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// DRAFT 조회
router.get('/draft', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('scenarios')
      .select(`
        scenario_id, title, player_count, status, background_image,
        rooms ( room_id, name, description, creation_method, image ),
        characters ( character_id, name, age, gender, public_desc, private_role, timeline, victory_cond, is_culprit, image ),
        clues ( clue_id, name, type, short_desc, long_desc, image, is_public, room_id ),
        truths ( truth_id, title, content )
      `)
      .eq('author_no', req.session.userNo)
      .eq('status', 'DRAFT')
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .single();

    if (error) return res.json({ success: true, data: null });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

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