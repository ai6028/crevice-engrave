// app/gap-admin/page.tsx
'use client';
import { useState } from 'react';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyTexts, setReplyTexts] = useState<Record<number, string>>({});

  // 获取所有留言（包含私密）
  const fetchAdminMessages = async () => {
    const res = await fetch('/api/messages', {
      method: 'PATCH',
      headers: { 'x-admin-password': password },
    });
    if (res.ok) {
      const data = await res.json();
      setMessages(data);
      setIsLoggedIn(true);
    } else {
      alert('暗号错误，无权限进入！');
    }
  };

  // 提交管理员的情绪解读
  const handleReply = async (id: number) => {
    const text = replyTexts[id];
    if (!text) return;

    const res = await fetch('/api/messages', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': password,
      },
      body: JSON.stringify({ id, admin_reply: text }),
    });

    if (res.ok) {
      alert('解读发布成功！');
      fetchAdminMessages();
    }
  };

  // 删除违规留言
  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这条留言吗？')) return;
    const res = await fetch('/api/messages', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': password,
      },
      body: JSON.stringify({ id, action: 'delete' }),
    });
    if (res.ok) fetchAdminMessages();
  };

  // 判断留言是否满12小时
  const canReply = (createdAt: string) => {
    try {
      const createTime = new Date(createdAt).getTime();
      const now = new Date().getTime();
      // 满 12 小时允许回复
      return (now - createTime) >= 12 * 60 * 60 * 1000;
    } catch {
      return true; 
    }
  };

  // 登录界面
  if (!isLoggedIn) {
    return (
      <div style={{ padding: '100px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>隙铭 · 管理员入口</h2>
        <input 
          type="password" 
          placeholder="请输入暗号" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: '10px', marginRight: '10px', border: '1px solid #ccc' }}
        />
        <button onClick={fetchAdminMessages} style={{ padding: '10px 20px', background: '#c06b6b', color: 'white', border: 'none', cursor: 'pointer' }}>
          进入后台
        </button>
      </div>
    );
  }

  // 后台界面
  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1>隙铭 · 管理后台</h1>
      <p style={{ color: '#888', marginBottom: '30px' }}>当前共有 {messages.length} 条留言记录</p>
      
      {messages.map((msg) => (
        <div key={msg.id} style={{ background: '#f9f9f9', padding: '20px', marginBottom: '20px', borderLeft: '4px solid #c06b6b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', fontSize: '12px', marginBottom: '10px' }}>
            <span>
              {msg.visibility === 'private' ? '🔒 私密留言' : '公开留言'} · {msg.created_at}
            </span>
            <button onClick={() => handleDelete(msg.id)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>删除</button>
          </div>
          <p style={{ fontSize: '16px', marginBottom: '20px' }}>{msg.content}</p>
          
          {msg.admin_reply ? (
            <div style={{ background: '#eef6f9', padding: '10px', borderLeft: '2px solid #a8c4d4' }}>
              <strong>已解读：</strong>{msg.admin_reply}
            </div>
          ) : (
            <div>
              {canReply(msg.created_at) ? (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input 
                    placeholder="输入情绪解读..." 
                    value={replyTexts[msg.id] || ''}
                    onChange={(e) => setReplyTexts({ ...replyTexts, [msg.id]: e.target.value })}
                    style={{ flex: 1, padding: '8px', border: '1px solid #ccc' }}
                  />
                  <button onClick={() => handleReply(msg.id)} style={{ padding: '8px 16px', background: '#a8c4d4', color: 'white', border: 'none', cursor: 'pointer' }}>
                    发布解读
                  </button>
                </div>
              ) : (
                <p style={{ color: 'orange', fontSize: '14px' }}>⏳ 留言发布未满 12 小时，暂不可解读。</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}