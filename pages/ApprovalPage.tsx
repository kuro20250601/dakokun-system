import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  getAllRequests,
  getRequestsBySupervisor,
  updateRequestStatus,
  applyClockCorrection,
  createNotification,
} from '../firebase/attendance';

const ApprovalPage: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadRequests = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      let reqs: any[];
      if (user.role === 'admin') {
        reqs = await getAllRequests();
      } else {
        reqs = await getRequestsBySupervisor(user.uid);
      }
      setRequests(reqs);
    } catch (e) {
      console.error('申請の読み込みに失敗しました:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [user]);

  const handleAction = async (requestId: string, action: 'approved' | 'denied') => {
    setActionLoading(requestId);
    setMessage(null);
    try {
      const request = requests.find(r => r.id === requestId);

      // 承認 & 打刻修正の場合、実際の勤怠データを修正する
      if (action === 'approved' && request && request.type?.includes('打刻修正')) {
        const target = request.type.includes('退勤') ? 'clockOut' : 'clockIn';
        await applyClockCorrection(request.userId, request.userName || '', request.date, target, request.requestedTime);
      }

      await updateRequestStatus(requestId, action);

      // 申請者に通知を送信
      if (request) {
        await createNotification({
          recipientId: request.userId,
          title: `申請が${action === 'approved' ? '承認' : '却下'}されました`,
          message: `${request.type}の申請が${action === 'approved' ? '承認' : '却下'}されました。`,
          type: 'approval',
          relatedRequestId: requestId,
          isRead: false,
        });
      }

      await loadRequests();
      setMessage({
        text: `${request?.userName || ''}さんの申請を${action === 'approved' ? '承認' : '却下'}しました。${action === 'approved' && request?.type?.includes('打刻修正') ? '打刻データを修正しました。' : ''}`,
        type: 'success',
      });
    } catch (e: any) {
      console.error('申請の処理に失敗しました:', e);
      setMessage({ text: `処理に失敗しました: ${e.message || e}`, type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  // ロール制限
  if (user && user.role !== 'admin' && user.role !== 'supervisor') {
    return (
      <div style={{ maxWidth: 900, margin: '32px auto', padding: '0 16px' }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: 24, textAlign: 'center', color: '#888' }}>
          このページは管理者・上長のみ利用できます。
        </div>
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  return (
    <div style={{ maxWidth: 900, margin: '32px auto', padding: '0 16px' }}>
      <div style={{ marginBottom: 18 }}>
        <Link to="/" style={{ color: '#2563eb', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
          &larr; ダッシュボードに戻る
        </Link>
      </div>

      {/* 結果メッセージ */}
      {message && (
        <div style={{
          padding: '12px 16px', borderRadius: 8, marginBottom: 18, fontWeight: 600, fontSize: 14,
          background: message.type === 'success' ? '#d1fae5' : '#fee2e2',
          color: message.type === 'success' ? '#065f46' : '#991b1b',
        }}>
          {message.text}
        </div>
      )}

      {/* 未処理の申請 */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px #0001', padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontWeight: 'bold', fontSize: 22, marginBottom: 18, color: '#222' }}>
          未処理の申請
          {pendingRequests.length > 0 && (
            <span style={{ marginLeft: 10, background: '#fef3c7', color: '#b45309', borderRadius: 10, padding: '4px 12px', fontSize: 14 }}>
              {pendingRequests.length}件
            </span>
          )}
        </h2>
        {isLoading ? (
          <div style={{ color: '#888', fontSize: 15 }}>読み込み中...</div>
        ) : pendingRequests.length === 0 ? (
          <div style={{ color: '#888', fontSize: 15 }}>未処理の申請はありません。</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15, minWidth: 700 }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ borderBottom: '2px solid #e5e7eb', padding: 10, textAlign: 'left', fontWeight: 700 }}>申請者</th>
                  <th style={{ borderBottom: '2px solid #e5e7eb', padding: 10, fontWeight: 700 }}>種別</th>
                  <th style={{ borderBottom: '2px solid #e5e7eb', padding: 10, fontWeight: 700 }}>対象日</th>
                  <th style={{ borderBottom: '2px solid #e5e7eb', padding: 10, fontWeight: 700 }}>修正時刻</th>
                  <th style={{ borderBottom: '2px solid #e5e7eb', padding: 10, textAlign: 'left', fontWeight: 700 }}>理由</th>
                  <th style={{ borderBottom: '2px solid #e5e7eb', padding: 10, fontWeight: 700 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map(r => (
                  <tr key={r.id}>
                    <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10 }}>{r.userName}</td>
                    <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10, textAlign: 'center' }}>{r.type}</td>
                    <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10, textAlign: 'center' }}>{r.date}</td>
                    <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10, textAlign: 'center' }}>{r.requestedTime}</td>
                    <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10 }}>{r.reason}</td>
                    <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10, textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                        <button
                          onClick={() => handleAction(r.id, 'approved')}
                          disabled={actionLoading === r.id}
                          style={{
                            background: '#22c55e', color: '#fff', border: 'none', borderRadius: 6,
                            padding: '8px 16px', fontSize: 14, cursor: 'pointer', fontWeight: 700,
                            opacity: actionLoading === r.id ? 0.6 : 1,
                          }}
                        >
                          承認
                        </button>
                        <button
                          onClick={() => handleAction(r.id, 'denied')}
                          disabled={actionLoading === r.id}
                          style={{
                            background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6,
                            padding: '8px 16px', fontSize: 14, cursor: 'pointer', fontWeight: 700,
                            opacity: actionLoading === r.id ? 0.6 : 1,
                          }}
                        >
                          却下
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 処理済みの申請 */}
      {processedRequests.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px #0001', padding: 24 }}>
          <h2 style={{ fontWeight: 'bold', fontSize: 22, marginBottom: 18, color: '#222' }}>処理済みの申請</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15, minWidth: 700 }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ borderBottom: '2px solid #e5e7eb', padding: 10, textAlign: 'left', fontWeight: 700 }}>申請者</th>
                  <th style={{ borderBottom: '2px solid #e5e7eb', padding: 10, fontWeight: 700 }}>種別</th>
                  <th style={{ borderBottom: '2px solid #e5e7eb', padding: 10, fontWeight: 700 }}>対象日</th>
                  <th style={{ borderBottom: '2px solid #e5e7eb', padding: 10, fontWeight: 700 }}>修正時刻</th>
                  <th style={{ borderBottom: '2px solid #e5e7eb', padding: 10, textAlign: 'left', fontWeight: 700 }}>理由</th>
                  <th style={{ borderBottom: '2px solid #e5e7eb', padding: 10, fontWeight: 700 }}>結果</th>
                </tr>
              </thead>
              <tbody>
                {processedRequests.map(r => (
                  <tr key={r.id}>
                    <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10 }}>{r.userName}</td>
                    <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10, textAlign: 'center' }}>{r.type}</td>
                    <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10, textAlign: 'center' }}>{r.date}</td>
                    <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10, textAlign: 'center' }}>{r.requestedTime}</td>
                    <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10 }}>{r.reason}</td>
                    <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10, textAlign: 'center' }}>
                      <span style={{
                        color: r.status === 'approved' ? '#22c55e' : '#ef4444',
                        fontWeight: 700,
                      }}>
                        {r.status === 'approved' ? '承認済み' : '却下済み'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalPage;
