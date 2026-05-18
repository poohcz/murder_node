// supabaseClient.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ 에러: .env 파일에 SUPABASE_URL 또는 SUPABASE_KEY가 없습니다!");
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;