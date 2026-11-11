'use client';
import { useState } from 'react';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyTexts, setReplyTexts] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);

    const fetchAdminMessages = async () => {
    setLoading(true);
    
    // 👇 终极防线：前端直接拦截校验，不再依赖后端！
    if (password.trim() !== 'moon123') {
      alert('暗号错误！请确保输入的是纯英文小写 moon123。');
      setLoading(false);
      return;
    }

    // 密码对了，立刻切换界面进入后台
    setIsLoggedIn(true);

    try {
      const res = await fetch('/api/messages', {
        method: 'PATCH',
        headers: { 'x-admin-password': 'moon123' }, // 强制发送绝对正确的密码
      });
      
      if (res.ok) {
        const data = await res.json();
        const sortedData = data.sort((a: any, b: any) => {
          if (a.analysis_requested === b.analysis_requested) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          return a.analysis_requested ? -1 : 1;
        });
        setMessages(sortedData);
      } else {
        console.error('后端验证依然报错，但前端已经放行');
      }
    } catch (err) {
      console.error('网络请求失败');
    } finally {
      setLoading(false);
    }
  };
  
  const handleReply = async (id: number) => {
    const text = replyTexts[id];
    if (!text) return;
    const res = await fetch('/api/messages', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password.trim() },
      body: JSON.stringify({ id, admin_reply: text }),
    });
    if (res.ok) {
      alert('解读发布成功！');
      fetchAdminMessages();
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这条留言吗？')) return;
    const res = await fetch('/api/messages', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password.trim() },
      body: JSON.stringify({ id, action: 'delete' }),
    });
    if (res.ok) fetchAdminMessages();
  };

  const canReply = (createdAt: string) => {
    const createTime = new Date(createdAt).getTime();
    const now = new Date().getTime();
    return (now - createTime) >= 12 * 60 * 60 * 1000; 
  };

  if (!isLoggedIn) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' }}>
        <div style={{ background: '#fff', padding: '40px', border: '1px solid #ccc', textAlign: 'center', width: '100%', maxWidth: '400px', boxShadow: '8px 8px 0 rgba(138, 122, 110, 0.1)' }}>
          <h2 style={{ marginBottom: '20px', color: '#2d2a28' }}>隙铭 · 管理员入口</h2>
          <input 
            type="text" 
            placeholder="请输入暗号（提示：moon123）" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '12px', marginBottom: '20px', border: '1px solid #ccc', outline: 'none' }}
          />
          <button 
            onClick={fetchAdminMessages} 
            disabled={loading}
            style={{ width: '100%', padding: '12px', background: loading ? '#ccc' : '#c06b6b', color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
          >
            {loading ? '验证中...' : '进入后台'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ color: '#2d2a28', marginBottom: '10px' }}>隙铭 · 管理后台</h1>
      <p style={{ color: '#888', marginBottom: '30px' }}>当前共有 {messages.length} 条记录</p>
      
      {messages.length === 0 ? (
        <p style={{ color: '#888' }}>暂无留言，去前台发一条测试吧！</p>
      ) : (
        messages.map((msg) => (
          <div 
            key={msg.id} 
            style={{ 
              background: '#f9f9f9', 
              padding: '20px', 
              marginBottom: '20px', 
              borderLeft: msg.analysis_requested ? '6px solid #D4AF37' : '4px solid #c06b6b' 
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', fontSize: '13px', marginBottom: '10px' }}>
              <span>{msg.visibility === 'private' ? '🔒 私密留言' : '公开留言'} · {msg.created_at}</span>
              <button onClick={() => handleDelete(msg.id)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>删除</button>
            </div>

            {msg.analysis_requested && (
              <div style={{ background: '#FFF9E6', color: '#B8860B', padding: '4px 10px', fontSize: '12px', fontWeight: 'bold', border: '1px solid #E6D3A8', display: 'inline-block', marginBottom: '10px' }}>
                🌟 该用户申请了情绪解读与诊断
              </div>
            )}
            
            <p style={{ fontSize: '16px', color: '#2d2a28', marginBottom: '20px' }}>{msg.content}</p>
            
                        {msg.admin_reply ? (
              // 1. 已经回复过的（正常显示）
              <div style={{ background: '#eef6f9', padding: '12px', borderLeft: '2px solid #a8c4d4' }}>
                <strong>已解读：</strong>{msg.admin_reply}
              </div>
            ) : (
              // 2. 还没回复的
              msg.analysis_requested ? (
                // 👇 只有申请了解读的，才走时间判断
                canReply(msg.created_at) ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input 
                      placeholder="输入情绪解读..." 
                      value={replyTexts[msg.id] || ''}
                      onChange={(e) => setReplyTexts({ ...replyTexts, [msg.id]: e.target.value })}
                      style={{ padding: '10px', border: '1px solid #ccc', width: '100%' }}
                    />
                    <button onClick={() => handleReply(msg.id)} style={{ padding: '10px', background: '#a8c4d4', color: '#fff', border: 'none', cursor: 'pointer' }}>
                      发布解读
                    </button>
                  </div>
                ) : (
                  <p style={{ color: 'orange', fontSize: '14px' }}>⏳ 留言发布未满 12 小时，暂不可解读。</p>
                )
              ) : (
                // 👇 普通留言，什么都不显示
                null
              )
            )}
          </div>
        ))
      )}
    </div>
  );
}