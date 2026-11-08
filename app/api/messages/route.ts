// app/api/messages/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 1. 获取公开留言
export async function GET() {
  try {
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
  } catch (error) {
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

// 2. 提交新留言
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { content, visibility = 'public', analysis = false } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: '留言不能为空' }, { status: 400 });
    }

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
    return NextResponse.json({ success: true, id: data[0].id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: '提交失败' }, { status: 500 });
  }
}

// 3. 删改与撤回操作 (彻底去掉密码限制，方便测试)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, admin_reply, action } = body;

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

// 4. 管理员获取所有留言 (彻底去掉密码限制)
export async function PATCH(request: Request) {
  try {
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