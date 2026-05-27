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

// Step2 - 방 저장 및 이미지 업로드
router.post('/step2', requireAuth, upload.any(), async (req, res, next) => {
  try {
    const scenarioId = req.body.scenarioId;
    const rooms = JSON.parse(req.body.rooms);

    for (let i = 0; i < rooms.length; i++) {
      const file = (req.files || []).find(f => f.fieldname === `room_image_${i}`);
      if (file) {
        const ext = file.originalname.split('.').pop();
        const fileName = `${scenarioId}_room_${i}_${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('scenario-images')
          .upload(fileName, file.buffer, { contentType: file.mimetype });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('scenario-images')
          .getPublicUrl(fileName);

        rooms[i].imageUrl = urlData.publicUrl;
      }
    }

    await supabase.from('rooms').delete().eq('scenario_id', scenarioId);

    const { error } = await supabase
      .from('rooms')
      .insert(rooms.map((r) => ({
        scenario_id: scenarioId,
        name: r.name,
        description: r.desc,
        creation_method: r.method,
        image: r.imageUrl || null,
      })));

    if (error) throw error;

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

        const { data: urlData } = supabase.storage
          .from('scenario-images').getPublicUrl(fileName);

        characters[i].imageUrl = urlData.publicUrl;
      }
    }

    await supabase.from('characters').delete().eq('scenario_id', scenarioId);

    const { error } = await supabase
      .from('characters')
      .insert(characters.map((c) => {
        const parsedAge = c.age && c.age.toString().trim() !== '' ? parseInt(c.age, 10) : null;
        const parsedGender = c.gender && c.gender.trim() !== '' ? c.gender : null;

        return {
          scenario_id: scenarioId,
          name: c.name,
          age: parsedAge,
          gender: parsedGender,
          public_desc: c.publicDesc,
          private_role: c.privateRole,
          timeline: JSON.stringify(c.timeline),
          victory_cond: c.victoryCondition,
          is_culprit: c.isCulprit,
          image: c.imageUrl || null, 
        };
      }));

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Step4 - 시나리오 북(페이지) 저장 및 이미지 업로드
router.post('/step4', requireAuth, upload.any(), async (req, res, next) => {
  try {
    const scenarioId = req.body.scenarioId;
    const pages = typeof req.body.pages === 'string' ? JSON.parse(req.body.pages) : req.body.pages;

    // 1. 인물 카드 이미지 업로드 (page_image_x)
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

    // 2. 기존 페이지 삭제 후 재저장
    await supabase.from('scenario_books').delete().eq('scenario_id', scenarioId);

    const { error } = await supabase
      .from('scenario_books')
      .insert(pages.map((p) => ({
        scenario_id: scenarioId,
        page_number: p.pageNumber,
        left_type: p.leftType,
        left_image: p.leftImage, 
        left_content: p.leftContent,
        right_title: p.rightTitle,
        right_content: p.rightContent,
        is_last: p.isLast,
      })));

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Step5 - 줄거리 + 진상 저장 + 출간
router.post('/step5', requireAuth, async (req, res, next) => {
  try {
    const { scenarioId, synopsis, truths } = req.body;

    await supabase
      .from('scenarios')
      .update({ summary: synopsis, status: 'PUBLISHED' })
      .eq('scenario_id', scenarioId);

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

// 내 DRAFT 조회 (🚀 에러 유발 원인이던 background_image 완벽 걷어냄)
router.get('/draft', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('scenarios')
      .select(`
        scenario_id, title, player_count, status,
        rooms ( room_id, name, description, creation_method, image ),
        characters ( character_id, name, age, gender, public_desc, private_role, timeline, victory_cond, is_culprit, image ), 
        scenario_books ( book_id, page_number, left_type, left_image, left_content, right_title, right_content, is_last ),
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

// DRAFT 삭제
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