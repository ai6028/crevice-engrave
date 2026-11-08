// app/api/messages/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// =========================================
// 1. 违禁词拦截系统
// =========================================
const bannedWords = [
  "傻逼", "妈的", "去死", "滚蛋", "脑残", "智障", "贱人", "草泥马","操你妈","装逼","犯贱","sb","弱智",
  "代开", "发票", "博彩", "赌博", "色情", "加微信", "加QQ", "兼职", "刷单", "网贷", "贷款",
  "自杀", "毒品", "枪支", "恐怖"
];

function containsBannedWords(text: string) {
  const lowerText = text.toLowerCase();
  return bannedWords.some(word => lowerText.includes(word));
}

// =========================================
// 2. IP 限流系统（防刷屏）
// =========================================
const ipCooldowns = new Map<string, number>();
const COOLDOWN_TIME = 60 * 1000; // 60秒冷却

// =========================================
// 3. 获取公开留言
// =========================================
export async function GET() {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('visibility', 'public')
    .eq('status', 'visible')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("==== Supabase 数据库报错 ====");
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json(data || []);
}

// =========================================
// 4. 提交新留言
// =========================================
export async function POST(request: Request) {
  try {
    // 限流检查
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const now = Date.now();
    const lastTime = ipCooldowns.get(ip) || 0;

    if (now - lastTime < COOLDOWN_TIME) {
      const waitSeconds = Math.ceil((COOLDOWN_TIME - (now - lastTime)) / 1000);
      return NextResponse.json(
        { error: `发言太快啦，请等待 ${waitSeconds} 秒后再试。` }, 
        { status: 429 }
      );
    }

    // 获取数据
    const body = await request.json();
    const { content, visibility = 'public', analysis = false } = body;

    // 空值校验
    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: '留言不能为空' }, { status: 400 });
    }

    // 违禁词校验
    if (containsBannedWords(content)) {
      return NextResponse.json({ error: '留言包含违禁词汇，请文明用语。' }, { status: 400 });
    }

    // 写入数据库
    const { data, error } = await supabase
      .from('messages')
      .insert([{ 
        content: content.trim(), 
        visibility, 
        status: 'visible',
        analysis_requested: analysis 
      }])
      .select();

    if (error) {
      console.error('POST Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 记录时间用于限流
    ipCooldowns.set(ip, now);

    return NextResponse.json({ success: true, id: data[0].id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: '提交失败' }, { status: 500 });
  }
}

// =========================================
// 5. 删改与撤回操作
// =========================================
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, admin_reply, action } = body;
    const authHeader = request.headers.get('x-admin-password');
    
    // 用户撤回不需要密码，其他操作需要密码
    if (action !== 'recall' && authHeader !== 'moon123') {
      return NextResponse.json({ error: '密码错误，无权限' }, { status: 401 });
    }

    if (action === 'recall' || action === 'delete') {
      const { error } = await supabase
        .from('messages')
        .update({ status: 'deleted' })
        .eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else if (admin_reply !== undefined) {
      const { error } = await supabase
        .from('messages')
        .update({ 
          admin_reply, 
          replied_at: new Date().toLocaleString('zh-CN') 
        })
        .eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}

// =========================================
// 6. 管理员获取所有留言
// =========================================
export async function PATCH(request: Request) {
  try {
    const authHeader = request.headers.get('x-admin-password');
    
    // 注意这里：我们用了 includes，防止前端传过来的字符串带空格
    if (!authHeader || !authHeader.includes('moon123')) {
      return NextResponse.json({ error: '密码错误，无权限' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .neq('status', 'deleted')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase Admin Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data || []);
  } catch (error) {
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}
