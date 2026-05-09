import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { clockIn, clockOut, getAllAttendances, createRequest, getRequestsByUser, getRequestsBySupervisor, updateRequestStatus, createNotification, getAttendancesBySubordinates } from '../firebase/attendance';
import { getAllUsers, updateUserRole } from '../firebase/auth';
import dayjs from 'dayjs';

const getWorkDuration = (clockIn: any, clockOut: any) => {
  if (!clockIn?.toDate || !clockOut?.toDate) return '';
  const start = clockIn.toDate();
  const end = clockOut.toDate();
  const diffMs = end - start;
  const diffH = diffMs / (1000 * 60 * 60);
  return diffH.toFixed(2) + ' h';
};

const cardStyle: React.CSSProperties = {
  maxWidth: 760, // 幅を少し狭く
  margin: '24px auto', // 上下余白を減らす
  background: '#fff',
  borderRadius: 14,
  boxShadow: '0 2px 12px #0001',
  padding: 18, // paddingを減らす
  display: 'flex',
  gap: 20, // カラム間のgapを減らす
  flexDirection: 'row',
  alignItems: 'flex-start',
};

const leftColStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 220,
};
const rightColStyle: React.CSSProperties = {
  flex: 2,
  minWidth: 280,
};

// スマホ用レスポンシブ
const responsiveStyle = `
@media (max-width: 800px) {
  .dashboard-flex {
    flex-direction: column !important;
    gap: 14px !important;
  }
  .dashboard-table {
    font-size: 13px !important;
  }
}
`;

// デジタル時計用のカスタムフック
function useNow() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

// タイムレコーダーカードの新しいスタイル
const recorderCardStyle: React.CSSProperties = {
  maxWidth: 520,
  margin: '32px auto 0',
  background: '#fff',
  borderRadius: 16,
  boxShadow: '0 2px 16px #0002',
  padding: '32px 32px 24px 32px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 0,
};
const recorderButtonRow: React.CSSProperties = {
  display: 'flex',
  width: '100%',
  gap: 0,
  margin: '24px 0 0 0',
};
const recorderButton: React.CSSProperties = {
  flex: 1,
  fontWeight: 'bold',
  fontSize: 18,
  border: 'none',
  borderRadius: 8,
  padding: '16px 0',
  cursor: 'pointer',
  transition: 'background 0.2s',
};
const clockBoxStyle: React.CSSProperties = {
  fontWeight: 'bold',
  fontSize: 40,
  color: '#2563eb',
  textAlign: 'center',
  letterSpacing: 2,
  margin: '0 0 4px 0',
};
const dateBoxStyle: React.CSSProperties = {
  textAlign: 'center',
  color: '#888',
  fontSize: 16,
  marginBottom: 18,
};
const todayBoxStyle: React.CSSProperties = {
  background: '#f3f4f6',
  borderRadius: 8,
  padding: 18,
  marginTop: 24,
  width: '100%',
  textAlign: 'left',
};


// 申請フォーム用のシンプルなモーダルUI
const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#0008', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
};
const modalCardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 12, boxShadow: '0 2px 16px #0003', padding: 32, minWidth: 340, maxWidth: '90vw', width: 400
};

// CSV出力ユーティリティ
function escapeCSVField(value: string): string {
  const str = String(value ?? '');
  // Excel数式インジェクション対策: 先頭が危険な文字の場合はシングルクォートを前置
  const sanitized = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  // カンマ・ダブルクォート・改行を含む場合はダブルクォートで囲む
  if (sanitized.includes(',') || sanitized.includes('"') || sanitized.includes('\n')) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  return sanitized;
}

function exportAttendancesToCSV(records: any[]) {
  const headers = ['日付', '社員名', '出勤', '退勤', '労働時間'];
  const rows = records.map(r => [
    r.date,
    r.userName,
    r.clockIn?.toDate?.().toLocaleTimeString?.() || '',
    r.clockOut?.toDate?.().toLocaleTimeString?.() || '',
    (typeof r.clockIn === 'object' && typeof r.clockOut === 'object') ? getWorkDuration(r.clockIn, r.clockOut) : ''
  ]);
  let csvContent = 'data:text/csv;charset=utf-8,' + headers.map(escapeCSVField).join(',') + '\n' + rows.map(e => e.map(escapeCSVField).join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `attendances_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const now = useNow();
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const [clockOutTime, setClockOutTime] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attendances, setAttendances] = useState<any[]>([]);
  const [subordinateAttendances, setSubordinateAttendances] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [roleUpdateLoading, setRoleUpdateLoading] = useState<string | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestType, setRequestType] = useState<'打刻修正' | '残業申請'>('打刻修正');
  const [requestDate, setRequestDate] = useState('');
  const [requestedTime, setRequestedTime] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [requestError, setRequestError] = useState('');

  useEffect(() => {
    if (user?.role === 'admin') {
      getAllAttendances().then(setAttendances);
      getRequestsByUser(user.uid).then(setMyRequests);
      getAllUsers().then(setAllUsers);
    }
    if (user?.role === 'employee') {
      getRequestsByUser(user.uid).then(setMyRequests);
    }
    if (user?.role === 'supervisor') {
      loadRequests();
      getAttendancesBySubordinates(user.uid).then(setSubordinateAttendances);
      getRequestsByUser(user.uid).then(setMyRequests);
    }
  }, [user]);

  const handleRoleChange = async (uid: string, newRole: 'admin' | 'supervisor' | 'employee') => {
    setRoleUpdateLoading(uid);
    try {
      await updateUserRole(uid, newRole);
      setAllUsers(prev => prev.map(u => u.id === uid ? { ...u, role: newRole } : u));
    } catch (e) {
      if (import.meta.env.DEV) console.error('ロール更新失敗:', e);
    } finally {
      setRoleUpdateLoading(null);
    }
  };

  const loadRequests = async () => {
    if (!user) return;
    try {
      const reqs = await getRequestsBySupervisor(user.uid);
      setRequests(reqs);
    } catch (error) {
      console.error('申請の読み込みに失敗しました:', error);
    }
  };

  const handleRequestAction = async (requestId: string, action: 'approved' | 'denied') => {
    try {
      await updateRequestStatus(requestId, action);
      // 申請者に通知を送信
      const request = requests.find(r => r.id === requestId);
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
      // 申請一覧を再読み込み
      await loadRequests();
    } catch (error) {
      console.error('申請の処理に失敗しました:', error);
    }
  };

  const handleClockIn = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      await clockIn(user.uid, user.name || user.email || '名無し');
      const now = new Date().toLocaleTimeString();
      setClockInTime(now);
      setMessage('出勤打刻しました！（Firestore保存済み）');
    } catch (e) {
      setMessage('出勤打刻に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      await clockOut(user.uid);
      const now = new Date().toLocaleTimeString();
      setClockOutTime(now);
      setMessage('退勤打刻しました！（Firestore保存済み）');
    } catch (e) {
      setMessage('退勤打刻に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 申請送信処理
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestLoading(true);
    setRequestError('');
    try {
      if (!user) throw new Error('ユーザー情報が取得できません');
      if (!requestDate || !requestedTime || !requestReason) throw new Error('すべての項目を入力してください');
      if (!/^\d{2}:\d{2}$/.test(requestedTime)) throw new Error('時刻は HH:MM 形式で入力してください');
      if (requestReason.length > 500) throw new Error('理由は500文字以内で入力してください');
      await createRequest({
        userId: user.uid,
        userName: user.name || user.email || '名無し',
        supervisorId: user.supervisorId || '',
        type: requestType,
        date: requestDate,
        requestedTime,
        reason: requestReason,
      });
      setRequestSuccess(true);
      setRequestDate(''); setRequestedTime(''); setRequestReason('');
      // 申請履歴を更新
      getRequestsByUser(user.uid).then(setMyRequests);
      if (user.role === 'supervisor') {
        await loadRequests();
      }
    } catch (e: any) {
      setRequestError(e.message || '申請に失敗しました');
    } finally {
      setRequestLoading(false);
    }
  };

  return (
    <>
      <style>{responsiveStyle}</style>
      {/* タイムレコーダーカード（中央1カラム縦並び） */}
      <div style={recorderCardStyle}>
        <h1 style={{ fontWeight: 'bold', fontSize: 22, marginBottom: 8, textAlign: 'center' }}>タイムレコーダー</h1>
        <div style={clockBoxStyle}>{dayjs(now).format('HH:mm:ss')}</div>
        <div style={dateBoxStyle}>{dayjs(now).format('YYYY年M月D日(ddd)')}</div>
        <div style={recorderButtonRow}>
          <button
            onClick={handleClockIn}
            disabled={isLoading}
            style={{ ...recorderButton, background: '#2563eb', color: '#fff', borderTopRightRadius: 0, borderBottomRightRadius: 0, opacity: isLoading ? 0.7 : 1 }}
          >
            出勤
          </button>
          <button
            onClick={handleClockOut}
            disabled={isLoading}
            style={{ ...recorderButton, background: '#e5e7eb', color: '#6b7280', borderTopLeftRadius: 0, borderBottomLeftRadius: 0, marginLeft: -1, opacity: isLoading ? 0.7 : 1 }}
          >
            退勤
          </button>
        </div>
        {message && <div style={{ color: '#2563eb', marginTop: 10, marginBottom: 0 }}>{message}</div>}
        <div style={todayBoxStyle}>
          <div style={{ marginBottom: 4, fontWeight: 500 }}>本日の打刻</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace', fontSize: 16 }}>
            <span>出勤: {clockInTime || '--:--:--'}</span>
            <span>退勤: {clockOutTime || '--:--:--'}</span>
          </div>
        </div>
      </div>
      {/* 申請ボタンエリア（カード風）: 全ロール共通 */}
      {(
        <div style={{
          maxWidth: 760,
          margin: '18px auto 0',
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 2px 8px #0001',
          padding: 12,
          display: 'flex',
          gap: 16,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <button
            style={{
              flex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid #2563eb', background: '#fff', color: '#2563eb', fontWeight: 'bold', fontSize: 16, borderRadius: 8, padding: '10px 0', cursor: 'pointer', transition: 'background 0.2s', gap: 8
            }}
            onClick={() => { setRequestType('打刻修正'); setShowRequestModal(true); }}
          >
            <svg width="20" height="20" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
            打刻修正申請
          </button>
          <button
            style={{
              flex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid #facc15', background: '#fff', color: '#b58105', fontWeight: 'bold', fontSize: 16, borderRadius: 8, padding: '10px 0', cursor: 'pointer', transition: 'background 0.2s', gap: 8
            }}
            onClick={() => { setRequestType('残業申請'); setShowRequestModal(true); }}
          >
            <svg width="20" height="20" fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            残業申請
          </button>
        </div>
      )}
      {/* 自分の申請履歴（全ロール共通） */}
      {(
        <div style={{ maxWidth: 900, margin: '18px auto 0', background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px #0001', padding: 24 }}>
          <h2 style={{ fontWeight: 'bold', fontSize: 20, marginBottom: 18, color: '#222' }}>自分の申請履歴</h2>
          {myRequests.length === 0 ? (
            <div style={{ color: '#888', fontSize: 15 }}>申請履歴はありません。</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15, minWidth: 600 }}>
                <thead>
                  <tr style={{ background: '#f3f4f6' }}>
                    <th style={{ borderBottom: '2px solid #e5e7eb', padding: 10, textAlign: 'left', fontWeight: 700 }}>申請日付</th>
                    <th style={{ borderBottom: '2px solid #e5e7eb', padding: 10, fontWeight: 700 }}>種別</th>
                    <th style={{ borderBottom: '2px solid #e5e7eb', padding: 10, fontWeight: 700 }}>時刻</th>
                    <th style={{ borderBottom: '2px solid #e5e7eb', padding: 10, textAlign: 'left', fontWeight: 700 }}>理由</th>
                    <th style={{ borderBottom: '2px solid #e5e7eb', padding: 10, fontWeight: 700 }}>ステータス</th>
                  </tr>
                </thead>
                <tbody>
                  {myRequests.map(r => (
                    <tr key={r.id}>
                      <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10 }}>{r.date}</td>
                      <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10, textAlign: 'center' }}>{r.type}</td>
                      <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10, textAlign: 'center' }}>{r.requestedTime}</td>
                      <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10 }}>{r.reason}</td>
                      <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10, textAlign: 'center' }}>
                        <span style={{
                          color: r.status === 'pending' ? '#eab308' : r.status === 'approved' ? '#22c55e' : '#ef4444',
                          fontWeight: 700,
                        }}>
                          {r.status === 'pending' ? '保留中' : r.status === 'approved' ? '承認済み' : '却下済み'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {/* 申請フォームモーダル */}
      {showRequestModal && (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <h2 style={{ fontWeight: 'bold', fontSize: 20, marginBottom: 16 }}>{requestType}フォーム</h2>
            {requestSuccess ? (
              <div style={{ color: '#2563eb', fontWeight: 'bold', textAlign: 'center', marginBottom: 16 }}>
                申請が送信されました！
                <br />
                <button style={{ marginTop: 16, padding: '8px 24px', borderRadius: 8, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 'bold', fontSize: 15, cursor: 'pointer' }} onClick={() => { setShowRequestModal(false); setRequestSuccess(false); }}>閉じる</button>
              </div>
            ) : (
              <form onSubmit={handleSubmitRequest}>
                <div style={{ marginBottom: 12 }}>
                  <label>申請日付：<input type="date" value={requestDate} onChange={e => setRequestDate(e.target.value)} style={{ marginLeft: 8, padding: 4, borderRadius: 4, border: '1px solid #ccc' }} required /></label>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label>{requestType === '打刻修正' ? '修正後の時刻' : '残業時間'}：
                    <input type="text" value={requestedTime} onChange={e => setRequestedTime(e.target.value)} style={{ marginLeft: 8, padding: 4, borderRadius: 4, border: '1px solid #ccc', width: 120 }} placeholder={requestType === '打刻修正' ? '09:00' : '2h'} required />
                  </label>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label>理由：<br />
                    <textarea value={requestReason} onChange={e => setRequestReason(e.target.value)} style={{ width: '100%', minHeight: 60, borderRadius: 4, border: '1px solid #ccc', padding: 4 }} required />
                  </label>
                </div>
                {requestError && <div style={{ color: 'red', marginBottom: 8 }}>{requestError}</div>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button type="button" onClick={() => setShowRequestModal(false)} style={{ padding: '8px 20px', borderRadius: 8, background: '#eee', color: '#333', border: 'none', fontWeight: 'bold', fontSize: 15, cursor: 'pointer' }}>キャンセル</button>
                  <button type="submit" disabled={requestLoading} style={{ padding: '8px 24px', borderRadius: 8, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 'bold', fontSize: 15, cursor: 'pointer', opacity: requestLoading ? 0.7 : 1 }}>{requestLoading ? '送信中...' : '申請する'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* 管理者用: 全従業員の打刻履歴テーブル */}
      {user?.role === 'admin' && (
        <div style={{
          maxWidth: 900,
          margin: '24px auto 0',
          background: '#fff',
          borderRadius: 14,
          boxShadow: '0 2px 12px #0001',
          padding: 24,
        }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
           <h2 style={{ fontWeight: 'bold', fontSize: 20, color: '#222', margin: 0 }}>全従業員勤怠管理</h2>
           <button
             onClick={() => exportAttendancesToCSV(attendances)}
             style={{ background: '#22c55e', color: '#fff', fontWeight: 'bold', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 15, cursor: 'pointer', boxShadow: '0 1px 4px #0001' }}
           >CSV出力</button>
         </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15, minWidth: 600 }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ borderBottom: '2px solid #e5e7eb', padding: 10, textAlign: 'left', fontWeight: 700 }}>日付</th>
                  <th style={{ borderBottom: '2px solid #e5e7eb', padding: 10, textAlign: 'left', fontWeight: 700 }}>社員名</th>
                  <th style={{ borderBottom: '2px solid #e5e7eb', padding: 10, fontWeight: 700 }}>出勤</th>
                  <th style={{ borderBottom: '2px solid #e5e7eb', padding: 10, fontWeight: 700 }}>退勤</th>
                  <th style={{ borderBottom: '2px solid #e5e7eb', padding: 10, fontWeight: 700 }}>労働時間</th>
                </tr>
              </thead>
              <tbody>
                {attendances.map(a => (
                  <tr key={a.id}>
                    <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10 }}>{a.date}</td>
                    <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10 }}>{a.userName}</td>
                    <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10, textAlign: 'center' }}>{a.clockIn?.toDate?.().toLocaleTimeString?.() || '--:--:--'}</td>
                    <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10, textAlign: 'center' }}>{a.clockOut?.toDate?.().toLocaleTimeString?.() || '--:--:--'}</td>
                    <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10, textAlign: 'center' }}>{getWorkDuration(a.clockIn, a.clockOut)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* 管理者用: ユーザー管理 */}
      {user?.role === 'admin' && (
        <div style={{ maxWidth: 900, margin: '24px auto 0', background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px #0001', padding: 24 }}>
          <h2 style={{ fontWeight: 'bold', fontSize: 20, marginBottom: 18, color: '#222' }}>ユーザー管理</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15, minWidth: 500 }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ borderBottom: '2px solid #e5e7eb', padding: 10, textAlign: 'left', fontWeight: 700 }}>名前</th>
                  <th style={{ borderBottom: '2px solid #e5e7eb', padding: 10, textAlign: 'left', fontWeight: 700 }}>メール</th>
                  <th style={{ borderBottom: '2px solid #e5e7eb', padding: 10, fontWeight: 700 }}>ロール</th>
                  <th style={{ borderBottom: '2px solid #e5e7eb', padding: 10, fontWeight: 700 }}>変更</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map(u => (
                  <tr key={u.id}>
                    <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10 }}>{u.name}</td>
                    <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10, color: '#555' }}>{u.email}</td>
                    <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10, textAlign: 'center' }}>
                      <span style={{
                        background: u.role === 'admin' ? '#dbeafe' : u.role === 'supervisor' ? '#fef9c3' : '#f0fdf4',
                        color: u.role === 'admin' ? '#1d4ed8' : u.role === 'supervisor' ? '#b45309' : '#15803d',
                        borderRadius: 6, padding: '2px 10px', fontWeight: 700, fontSize: 13,
                      }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10, textAlign: 'center' }}>
                      {u.id === user.uid ? (
                        <span style={{ color: '#aaa', fontSize: 13 }}>（自分）</span>
                      ) : (
                        <select
                          value={u.role}
                          disabled={roleUpdateLoading === u.id}
                          onChange={e => handleRoleChange(u.id, e.target.value as 'admin' | 'supervisor' | 'employee')}
                          style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, cursor: 'pointer' }}
                        >
                          <option value="employee">employee</option>
                          <option value="supervisor">supervisor</option>
                          <option value="admin">admin</option>
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* 上司用: 部下の勤怠履歴 */}
      {user?.role === 'supervisor' && (
        <div style={{ maxWidth: 900, margin: '24px auto 0', background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px #0001', padding: 24 }}>
          <h2 style={{ fontWeight: 'bold', fontSize: 20, marginBottom: 18, color: '#222' }}>部下の勤怠履歴</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15, minWidth: 600 }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ borderBottom: '2px solid #e5e7eb', padding: 10, textAlign: 'left', fontWeight: 700 }}>日付</th>
                  <th style={{ borderBottom: '2px solid #e5e7eb', padding: 10, textAlign: 'left', fontWeight: 700 }}>社員名</th>
                  <th style={{ borderBottom: '2px solid #e5e7eb', padding: 10, fontWeight: 700 }}>出勤</th>
                  <th style={{ borderBottom: '2px solid #e5e7eb', padding: 10, fontWeight: 700 }}>退勤</th>
                  <th style={{ borderBottom: '2px solid #e5e7eb', padding: 10, fontWeight: 700 }}>労働時間</th>
                </tr>
              </thead>
              <tbody>
                {subordinateAttendances.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: 16, color: '#888', textAlign: 'center' }}>部下の勤怠データがありません</td></tr>
                ) : (
                  subordinateAttendances.map(a => (
                    <tr key={a.id}>
                      <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10 }}>{a.date}</td>
                      <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10 }}>{a.userName}</td>
                      <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10, textAlign: 'center' }}>{a.clockIn?.toDate?.().toLocaleTimeString?.() || '--:--:--'}</td>
                      <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10, textAlign: 'center' }}>{a.clockOut?.toDate?.().toLocaleTimeString?.() || '--:--:--'}</td>
                      <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10, textAlign: 'center' }}>{getWorkDuration(a.clockIn, a.clockOut)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* 上司用: 部下の申請一覧 */}
      {user?.role === 'supervisor' && (
        <div style={{ maxWidth: 900, margin: '24px auto 0', background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px #0001', padding: 24 }}>
          <h2 style={{ fontWeight: 'bold', fontSize: 20, marginBottom: 18, color: '#222' }}>部下の申請一覧</h2>
          {requests.length === 0 ? (
            <div style={{ color: '#888', fontSize: 15 }}>保留中の申請はありません。</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15, minWidth: 600 }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ borderBottom: '2px solid #e5e7eb', padding: 10, textAlign: 'left', fontWeight: 700 }}>申請者</th>
                  <th style={{ borderBottom: '2px solid #e5e7eb', padding: 10, fontWeight: 700 }}>種別</th>
                  <th style={{ borderBottom: '2px solid #e5e7eb', padding: 10, fontWeight: 700 }}>日付</th>
                  <th style={{ borderBottom: '2px solid #e5e7eb', padding: 10, fontWeight: 700 }}>内容</th>
                  <th style={{ borderBottom: '2px solid #e5e7eb', padding: 10, fontWeight: 700 }}>状態</th>
                  <th style={{ borderBottom: '2px solid #e5e7eb', padding: 10, fontWeight: 700 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id}>
                    <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10 }}>{r.userName}</td>
                    <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10, textAlign: 'center' }}>{r.type}</td>
                    <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10, textAlign: 'center' }}>{r.date}</td>
                    <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10 }}>{r.reason}</td>
                    <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10, textAlign: 'center' }}>
                      <span style={{
                        color: r.status === 'pending' ? '#eab308' : r.status === 'approved' ? '#22c55e' : '#ef4444',
                        fontWeight: 700
                      }}>
                        {r.status === 'pending' ? '保留中' : r.status === 'approved' ? '承認済み' : '却下済み'}
                      </span>
                    </td>
                    <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10, textAlign: 'center' }}>
                      {r.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleRequestAction(r.id, 'approved')}
                            style={{
                              background: '#22c55e',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '4px 8px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              fontWeight: 'bold',
                            }}
                          >
                            承認
                          </button>
                          <button
                            onClick={() => handleRequestAction(r.id, 'denied')}
                            style={{
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '4px 8px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              fontWeight: 'bold',
                            }}
                          >
                            却下
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </>
  );
};

export default DashboardPage;