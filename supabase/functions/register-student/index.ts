import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: '只接受 POST 請求。' }, 405);
  try {
    const { student_id, password } = await req.json();
    if (typeof student_id !== 'string' || !/^(?!000)[0-9]{9}$/.test(student_id)) {
      return json({ error: '學號必須為 9 位數字，前三碼不可為 000。' }, 400);
    }
    if (typeof password !== 'string' || password.length === 0) {
      return json({ error: '請輸入密碼。' }, 400);
    }
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceKey) return json({ error: '伺服器尚未完成設定。' }, 500);
    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const email = `${student_id}@students.ntut.example.com`;

    // student_accounts 的 UNIQUE(student_id) 是最終防線；先查詢可提供友善錯誤訊息。
    const { data: existing } = await admin.from('student_accounts').select('student_id').eq('student_id', student_id).maybeSingle();
    if (existing) return json({ error: '此學號已註冊，請直接登入。' }, 409);

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { account_type: 'student' },
    });
    if (createError || !created.user) {
      const message = createError?.message || '建立帳號失敗。';
      if (/already|registered|exists/i.test(message)) return json({ error: '此學號已註冊，請直接登入。' }, 409);
      // 不在回應中暴露後端細節或任何秘密。
      return json({ error: '建立帳號失敗，請確認密碼符合 Supabase 的最低要求後重試。' }, 400);
    }
    const { error: profileError } = await admin.from('student_accounts').insert({ user_id: created.user.id, student_id });
    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id);
      if (profileError.code === '23505') return json({ error: '此學號已註冊，請直接登入。' }, 409);
      return json({ error: '建立學號資料失敗，請稍後重試。' }, 500);
    }
    return json({ ok: true });
  } catch (_error) {
    return json({ error: '請求格式錯誤，請稍後重試。' }, 400);
  }
});
