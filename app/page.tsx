// app/page.tsx
'use client';

import { useState, useEffect } from 'react';

type Message = {
  id: number;
  content: string;
  created_at: string;
  admin_reply: string | null;
  analysis_requested: boolean;
  allow_comments?: boolean;
};

export default function Home() {
  const [isAnalysisRequested, setIsAnalysisRequested] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [myMessageIds, setMyMessageIds] = useState<number[]>([]);
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [showReplyNotice, setShowReplyNotice] = useState(false);

  const fetchMessages = async () => {
    const res = await fetch('/api/messages');
    const data = await res.json();

    if (!Array.isArray(data)) {
      console.error("后端报错了，返回的数据是：", data);
      setMessages([]);
      return;
    }
    setMessages(data);

    const saved = localStorage.getItem('myMessageIds');
    if (saved) {
      const myIds = JSON.parse(saved);
      const hasNewReply = data.some((msg: Message) => 
        myIds.includes(msg.id) && msg.admin_reply !== null
      );
      if (hasNewReply) {
        setShowReplyNotice(true);
      }
    }
  };

  useEffect(() => {
    fetchMessages();
    const saved = localStorage.getItem('myMessageIds');
    if (saved) {
      setMyMessageIds(JSON.parse(saved));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || loading) return;

    setLoading(true);
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        visibility: isPrivate ? 'private' : 'public',
        analysis: isAnalysisRequested,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const newIds = [...myMessageIds, data.id];
      setMyMessageIds(newIds);
      localStorage.setItem('myMessageIds', JSON.stringify(newIds));

      setContent(''); 
      setIsPrivate(false); 
      setIsAnalysisRequested(false);
      await fetchMessages(); 
    } else {
      const errorData = await res.json();
      alert(errorData.error || '发送失败');
    }
    setLoading(false);
  };

  const handleRecall = async (id: number) => {
    if (!confirm('确定要撤回这条留言吗？撤回后将无法恢复。')) return;
    
    const res = await fetch('/api/messages', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'recall' }),
    });

    if (res.ok) {
      alert('已成功撤回');
      await fetchMessages();
    }
  };

  return (
    <>
      <div className="bg-shape-blue-1"></div>
      <div className="bg-shape-brown-1"></div>
      <div className="math-line horizontal" style={{ top: '30%' }}></div>
      <div className="math-line vertical" style={{ left: '20%' }}></div>
      <div className="math-circle circle-1"></div>
      <div className="math-circle circle-2"></div>

      <header className="hero">
        {showAnnouncement && (
          <div className="announcement">
            <span>📢 隙铭公告：本留言板严禁任何不良言论与恶意刷屏行为，感谢你的真诚与配合。</span>
            <span className="announcement-close" onClick={() => setShowAnnouncement(false)}>×</span>
          </div>
        )}

        <div className="hero-content">
          <div className="hero-tag">隙铭网络留言板 / 2026</div>
          <h1 className="hero-title">CREVICE<br /><span>ENGRAVE:</span></h1>
          <div className="hero-subtitle">● 罅隙虽小 · 足以铭刻</div>
          <p className="hero-desc">
            在缝隙中，铭刻真实的自己。欢迎来到「隙铭」匿名留言板。剥离现实的虚饰，这里是匿名且彻底保护隐私的文本空间。你可以在此交出自己的困惑、隐痛与不解。诚实作答，是你对自我负责的开端。网站匿名且保证隐私，资料档案不会留痕。每日留言将由管理员进行筛选与清理，并在间隔一天后，以结构性视角对有价值的困惑进行拆解与回应。隙间有铭，期待你的直面。
          </p>
        </div>
      </header>

      {showReplyNotice && (
        <div style={{ maxWidth: '1100px', margin: '0 auto 20px', padding: '0 20px', position: 'relative', zIndex: 30 }}>
          <div style={{
            background: 'var(--accent-secondary)',
            color: 'var(--text-dark)',
            padding: '14px 20px',
            fontSize: '14px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '4px 4px 0 rgba(0,0,0,0.05)'
          }}>
            <span>✉️</span>
            <span>管理员已为你之前的留言留下了情绪解读，请向下滑动查看。</span>
            <button 
              onClick={() => setShowReplyNotice(false)}
              style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--text-dark)' }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="main-layout">
        <aside className="sidebar">
          <div className="side-box" onClick={() => setIsFileModalOpen(true)} style={{ cursor: 'pointer' }}>
            <div className="side-box-label"><span>FILE_01</span><span>↗</span></div>
            <div className="side-box-title">文件分享</div>
            <div className="side-box-desc">点击获取相关资料和文件</div>
          </div>

          <a href="/about.html" className="side-box" style={{ textDecoration: 'none', display: 'flex' }}>
            <div className="side-box-label"><span>INFO_02</span><span>↗</span></div>
            <div className="side-box-title">关于隙铭</div>
            <div className="side-box-desc">了解留言规则与管理者理念</div>
          </a>
        </aside>

        <main className="content-area">
          <section className="form-section">
            <div className="form-header">留下你的痕迹</div>
            <form onSubmit={handleSubmit}>
              <div className="textarea-wrapper">
                <textarea 
                  className={isAnalysisRequested ? 'textarea-yellow' : ''}
                  placeholder={isAnalysisRequested ? "你已开启情绪解读，请在此写下你的困惑...（绝对匿名）" : "在这里写下你想说的话……（绝对匿名）"}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={500}
                ></textarea>
              </div>
              <div className="form-bottom" style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                <label className="checkbox-wrapper">
                  <input 
                    type="checkbox" 
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                  />
                  仅管理员可见
                </label>
                
                <label className="checkbox-wrapper">
                  <input 
                    type="checkbox" 
                    checked={isAnalysisRequested}
                    onChange={(e) => setIsAnalysisRequested(e.target.checked)}
                  />
                  情绪解读与诊断
                </label>

                <button type="submit" className="btn-submit" disabled={loading} style={{ marginLeft: 'auto' }}>
                  {loading ? '发送中...' : '发送留言 ↗'}
                </button>
              </div>
            </form>
          </section>

          <section className="list-section">
            {messages.length === 0 ? (
              <div className="message-card">
                <div className="message-content">还没有留言，来做第一个在缝隙中铭刻的人吧。</div>
              </div>
            ) : (
              messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`message-card ${msg.analysis_requested ? 'yellow-border' : ''}`}
                >
                  <div className="message-meta">
                    <span>匿名访客</span>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <span>{msg.created_at}</span>
                      {myMessageIds.includes(msg.id) && (
                        <span 
                          onClick={() => handleRecall(msg.id)} 
                          style={{ color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          撤回
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="message-content">{msg.content}</div>
                  
                  {msg.admin_reply ? (
                    <div className="admin-reply">{msg.admin_reply}</div>
                  ) : (
                    <>
                      {msg.analysis_requested === true && (
                        <div className="admin-reply pending">
                          留言发布未满 12 小时，管理员稍后为你解读。
                        </div>
                      )}
                      
                      {(msg as any).allow_comments === true && (
                        <div className="admin-reply pending" style={{ borderColor: 'var(--accent-secondary)', color: 'var(--accent-secondary)' }}>
                          想评论互动一下吗，欢迎留言。
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))
            )}
          </section>
        </main>
      </div>

      {isFileModalOpen && (
        <div className="modal-overlay" onClick={() => setIsFileModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">◆ 隙铭资料库</span>
              <span className="modal-close" onClick={() => setIsFileModalOpen(false)}>×</span>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '20px', color: 'var(--text-dark)' }}>
                这里存放着隙铭的相关文档，点击即可获取。
              </p>
              <div className="file-list">
                <a href="/什么是无意识？.pdf" download className="file-item">
                  <span className="file-name">什么是无意识？</span>
                  <span className="file-size">PDF · 423KB</span>
                </a>
                <a href="/梦的解析.pdf" download className="file-item">
                  <span className="file-name">梦的成因及解析</span>
                  <span className="file-size">PDF · 104KB</span>
                </a>
                <a href="/镜像阶段.pdf" download className="file-item">
                  <span className="file-name">自恋与镜像的关系</span>
                  <span className="file-size">PDF · 134KB</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}