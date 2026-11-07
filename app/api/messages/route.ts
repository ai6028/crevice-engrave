// app/api/messages/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 1. 获取公开留言
export async function GET() {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('visibility', 'public')
    .eq('status', 'visible')
    .order('created_at', { ascending: false });

  if (error) {
    // 👇 把真正的报错信息打印在终端里
    console.error("==== Supabase 数据库报错 ====");
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  // 如果没报错，但 data 是 null，也返回空数组
  return NextResponse.json(data || []);
}


// 2. 提交新留言
export async function POST(request: Request) {
  try {
    const body = await request.json();
    // 👇 新增解构出 analysis 变量
    const { content, visibility = 'public', analysis = false } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: '留言不能为空' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('messages')
      // 👇 把 analysis_requested: analysis 存进 Supabase
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
    return NextResponse.json({ success: true, id: data[0].id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: '提交失败' }, { status: 500 });
  }
}

// 3. 删改与撤回操作
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, admin_reply, action } = body;
    const authHeader = request.headers.get('x-admin-password');
    
    // 用户撤回不需要密码，其他操作需要 'moon123' 密码
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

// 4. 管理员获取所有留言（包含私密）
export async function PATCH(request: Request) {
  try {
    const authHeader = request.headers.get('x-admin-password');
    if (authHeader !== 'moon123') {
      return NextResponse.json({ error: '密码错误，无权限' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .neq('status', 'deleted')
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}