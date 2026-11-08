// app/gap-admin/page.tsx
'use client';
import { useState } from 'react';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyTexts, setReplyTexts] = useState<Record<number, string>>({});

  const fetchAdminMessages = async () => {
    const res = await fetch('/api/messages', {
      method: 'PATCH',
      headers: { 'x-admin-password': password },
    });
    if (res.ok) {
      const data = await res.json();
      
      // 👇 前端加一层保险：把所有申请了解读的留言自动排在前面，方便你处理
      const sortedData = data.sort((a: any, b: any) => {
        if (a.analysis_requested === b.analysis_requested) {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        return a.analysis_requested ? -1 : 1; // true 排前面
      });

      setMessages(sortedData);
      setIsLoggedIn(true);
    } else {
      alert('暗号错误，无权限进入！');
    }
  };

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
      return (now - createTime) >= 12 * 60 * 60 * 1000;
    } catch {
      return true; 
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="admin-login-container">
        <div className="admin-login-box">
          <h2>隙铭 · 管理员入口</h2>
          <input 
            type="password" 
            placeholder="请输入暗号" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="admin-input"
          />
          <button onClick={fetchAdminMessages} className="admin-btn-primary">
            进入后台
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <header className="admin-header">
        <h1>隙铭 · 管理后台</h1>
        <p>当前共有 {messages.length} 条留言记录</p>
      </header>
      
      <div className="admin-list">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className="admin-card"
            style={{ 
              // 给申请了情绪解读的留言，左边框变成金色
              borderLeftColor: msg.analysis_requested ? '#D4AF37' : 'var(--accent-primary)',
              borderLeftWidth: msg.analysis_requested ? '6px' : '4px'
            }}
          >
            <div className="admin-card-meta">
              <span>
                {msg.visibility === 'private' ? '🔒 私密留言' : '公开留言'} · {msg.created_at}
              </span>
              <button onClick={() => handleDelete(msg.id)} className="admin-btn-delete">删除</button>
            </div>

            {/* 醒目的黄色高亮标签 */}
            {msg.analysis_requested && (
              <div style={{ 
                display: 'inline-block', 
                background: '#FFF9E6', 
                color: '#B8860B', 
                padding: '4px 10px', 
                fontSize: '12px', 
                fontWeight: 'bold', 
                border: '1px solid #E6D3A8',
                marginBottom: '10px',
                marginTop: '5px'
              }}>
                🌟 该用户申请了情绪解读与诊断
              </div>
            )}
            
            <p className="admin-content">{msg.content}</p>
            
            {msg.admin_reply ? (
              <div className="admin-replied">
                <strong>已解读：</strong>{msg.admin_reply}
              </div>
            ) : (
              <div>
                {canReply(msg.created_at) ? (
                  <div className="admin-reply-box">
                    <input 
                      placeholder="输入情绪解读..." 
                      value={replyTexts[msg.id] || ''}
                      onChange={(e) => setReplyTexts({ ...replyTexts, [msg.id]: e.target.value })}
                      className="admin-input"
                    />
                    <button onClick={() => handleReply(msg.id)} className="admin-btn-submit">
                      发布解读
                    </button>
                  </div>
                ) : (
                  <p className="admin-warning">⏳ 留言发布未满 12 小时，暂不可解读。</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}