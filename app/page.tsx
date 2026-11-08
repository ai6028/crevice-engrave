// app/page.tsx
'use client';

import { useState, useEffect } from 'react';

type Message = {
  id: number;
  content: string;
  created_at: string;
  admin_reply: string | null;
  analysis_requested: boolean;
  allow_replies?: boolean;
  parent_id?: number | null;
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
  const [hiddenMessageIds, setHiddenMessageIds] = useState<number[]>([]);
  const [allowReplies, setAllowReplies] = useState(false);

  // 用于控制哪条主留言展开了回复输入框
  const [activeReplyId, setActiveReplyId] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  useEffect(() => {
    const savedHidden = localStorage.getItem('hiddenMessageIds');
    if (savedHidden) setHiddenMessageIds(JSON.parse(savedHidden));
  }, []);

  const handleHideMessage = (id: number) => {
    const newHidden = [...hiddenMessageIds, id];
    setHiddenMessageIds(newHidden);
    localStorage.setItem('hiddenMessageIds', JSON.stringify(newHidden));
  };

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
      if (hasNewReply) setShowReplyNotice(true);
    }
  };

  useEffect(() => {
    fetchMessages();
    const saved = localStorage.getItem('myMessageIds');
    if (saved) setMyMessageIds(JSON.parse(saved));
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
        allow_replies: allowReplies,
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
      setAllowReplies(false);
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

  // 提交回复（盖楼）的函数
  const handleReplySubmit = async (parentId: number) => {
    if (!replyContent.trim() || replyLoading) return;
    setReplyLoading(true);

    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: replyContent,
        parent_id: parentId,
        visibility: 'public',
        allow_replies: false
      }),
    });

    if (res.ok) {
      setReplyContent('');
      setActiveReplyId(null);
      await fetchMessages();
    } else {
      const errorData = await res.json();
      alert(errorData.error || '回复失败');
    }
    setReplyLoading(false);
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
            <span>📢 隙铭公告：本留言板目前处于测试阶段，如有好的建议欢迎在留言板中分享，非常感谢。</span>
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
                  <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
                  仅管理员可见
                </label>
                
                <label className="checkbox-wrapper">
                  <input type="checkbox" checked={isAnalysisRequested} onChange={(e) => setIsAnalysisRequested(e.target.checked)} />
                  情绪解读与诊断
                </label>

                <label className="checkbox-wrapper">
                  <input type="checkbox" checked={allowReplies} onChange={(e) => setAllowReplies(e.target.checked)} />
                  允许其他用户回复
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
              // 只渲染主留言（parent_id 为空的）
              messages.filter((msg) => !hiddenMessageIds.includes(msg.id) && !msg.parent_id).map((msg) => {
                
                // 找出挂在这条主留言下的回复（最多3条）
                const replies = messages.filter((r) => r.parent_id === msg.id && !hiddenMessageIds.includes(r.id)).slice(0, 3);
                const replyCount = replies.length;

                return (
                  <div 
                    key={msg.id} 
                    className={`message-card ${msg.analysis_requested ? 'yellow-border' : ''}`}
                  >
                    <div className="message-meta">
                      <span>匿名访客</span>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <span>
                          {new Date(msg.created_at).toLocaleString('zh-CN', {
                            year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                        {myMessageIds.includes(msg.id) && (
                          <span onClick={() => handleRecall(msg.id)} style={{ color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 'bold' }}>
                            撤回
                          </span>
                        )}
                        <span 
                          onClick={() => handleHideMessage(msg.id)} 
                          style={{ color: 'var(--text-main)', cursor: 'pointer', fontSize: '12px', border: '1px solid var(--border-light)', padding: '2px 6px', borderRadius: '4px', marginLeft: '4px' }}
                          title="不再显示此条留言"
                        >
                          屏蔽
                        </span>
                      </div>
                    </div>
                    
                    <div className="message-content">{msg.content}</div>
                    
                    {/* 管理员回复 */}
                    {msg.admin_reply ? (
                      <div className="admin-reply">{msg.admin_reply}</div>
                    ) : (
                      <>
                        {msg.analysis_requested === true && (
                          <div className="admin-reply pending">
                            留言发布未满 12 小时，管理员稍后为你解读。
                          </div>
                        )}
                      </>
                    )}

                    {/* ================= 盖楼区域 ================= */}
                    {msg.allow_replies && (
                      <div style={{ marginTop: '20px', borderTop: '1px dashed var(--border-light)', paddingTop: '16px' }}>
                        
                        {/* 回复列表（带向右箭头） */}
                        {replyCount > 0 && (
                          <div style={{ marginBottom: '16px' }}>
                            {replies.map((reply, index) => (
                              <div key={reply.id} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <div style={{ color: 'var(--accent-primary)', fontFamily: 'monospace', marginTop: '4px', whiteSpace: 'nowrap', marginRight: '8px' }}>
                                  ------&gt;
                                </div>
                                <div style={{ background: '#fff', padding: '10px 14px', borderLeft: '2px solid var(--accent-secondary)', fontSize: '14px', color: 'var(--text-dark)', flex: 1 }}>
                                  {reply.content}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 如果回复没满3条，显示操作入口 */}
                        {replyCount < 3 ? (
                          <div>
                            {activeReplyId === msg.id ? (
                              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <input 
                                  type="text" 
                                  value={replyContent}
                                  onChange={(e) => setReplyContent(e.target.value)}
                                  placeholder="写下你的回复..." 
                                  style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border-light)', outline: 'none' }}
                                  autoFocus
                                />
                                <button onClick={() => handleReplySubmit(msg.id)} disabled={replyLoading} style={{ background: 'var(--accent-primary)', color: '#fff', border: 'none', padding: '0 16px', cursor: 'pointer' }}>
                                  发送
                                </button>
                                <button onClick={() => { setActiveReplyId(null); setReplyContent(''); }} style={{ background: 'transparent', color: 'var(--text-main)', border: 'none', cursor: 'pointer' }}>
                                  取消
                                </button>
                              </div>
                            ) : (
                              <span 
                                onClick={() => { setActiveReplyId(msg.id); setReplyContent(''); }}
                                style={{ color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
                              >
                                {replyCount === 0 ? '该留言目前还没有回复，想说些什么吗？' : `已有 ${replyCount} 条回复，点击继续跟进 ↗`}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div style={{ color: 'var(--text-main)', fontSize: '12px', opacity: 0.6 }}>
                            该条留言已达回复上限 (3/3)
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                );
              })
            )}
          </section>
        </main>
      </div>

      {/* 文件分享弹窗层 */}
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
                  <span className="file-name">镜像与自恋的关系</span>
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