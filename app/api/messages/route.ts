// app/api/messages/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'messages.json');
// 记录每个 IP 最近一次留言的时间
const ipCooldowns = new Map<string, number>();

function getMessages() {
  if (!fs.existsSync(dataFilePath)) {
    fs.writeFileSync(dataFilePath, JSON.stringify([]));
  }
  const data = fs.readFileSync(dataFilePath, 'utf-8');
  return JSON.parse(data);
}

function saveMessages(messages: any[]) {
  fs.writeFileSync(dataFilePath, JSON.stringify(messages, null, 2));
}

// 1. 首页获取公开留言
export async function GET() {
  try {
    const messages = getMessages();
    const publicMessages = messages
      .filter((m: any) => m.visibility === 'public' && m.status === 'visible')
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return NextResponse.json(publicMessages);
  } catch (error) {
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

// 2. 游客提交留言
export async function POST(request: Request) {
  try {
    // 获取访客 IP（Next.js 获取 IP 的方式）
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const lastTime = ipCooldowns.get(ip) || 0;

    // 如果距离上次留言不到 60000 毫秒（1分钟），就拒绝
    if (now - lastTime < 60000) {
      return NextResponse.json({ error: '你发言太快啦，休息一分钟再试吧。' }, { status: 429 });
    }
    const body = await request.json();
    const { content, visibility = 'public' } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: '留言不能为空' }, { status: 400 });
    }

    const messages = getMessages();
    const newMessage = {
      id: Date.now(),
      content: content.trim(),
      visibility,
      status: 'visible',
      created_at: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
      admin_reply: null
    };

    messages.push(newMessage);
    saveMessages(messages);
    
    // 记录这次留言的时间
    ipCooldowns.set(ip, now);
    
    return NextResponse.json({ success: true, id: newMessage.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: '提交失败' }, { status: 500 });
  }
}

// 3. 删改与撤回 (包含了撤回放行逻辑)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, admin_reply, action } = body;
    const authHeader = request.headers.get('x-admin-password');
    
    // 【核心】：用户撤回不需要密码，其他操作需要 'moon123' 密码
    if (action !== 'recall' && authHeader !== 'moon123') {
      return NextResponse.json({ error: '密码错误，无权限' }, { status: 401 });
    }

    let messages = getMessages();
    const targetIndex = messages.findIndex((m: any) => m.id === id);

    if (targetIndex === -1) {
      return NextResponse.json({ error: '找不到该留言' }, { status: 404 });
    }

    if (action === 'recall' || action === 'delete') {
      messages[targetIndex].status = 'deleted';
    } else if (admin_reply !== undefined) {
      messages[targetIndex].admin_reply = admin_reply;
      messages[targetIndex].replied_at = new Date().toLocaleString('zh-CN');
    }

    saveMessages(messages);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}

// 4. 管理员获取所有留言（包含私密留言）
export async function PATCH(request: Request) {
  try {
    const authHeader = request.headers.get('x-admin-password');
    if (authHeader !== 'moon123') {
      return NextResponse.json({ error: '密码错误，无权限' }, { status: 401 });
    }

    const messages = getMessages();
    const visibleMessages = messages
      .filter((m: any) => m.status !== 'deleted')
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
    return NextResponse.json(visibleMessages);
  } catch (error) {
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}