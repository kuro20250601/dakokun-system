import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { clockIn, clockOut, getAllAttendances, createRequest } from '../firebase/attendance';
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

// supervisor用ダミーデータ
const dummySubordinates = [
  { id: 'user-1', name: '田中 太郎' },
  { id: 'user-2', name: '佐藤 花子' },
];
const dummyAttendance = [
  { date: '2025-07-12', name: '田中 太郎', clockIn: '09:01:15', clockOut: '18:05:20', workDuration: '9.07 h' },
  { date: '2025-07-12', name: '佐藤 花子', clockIn: '09:30:00', clockOut: '17:45:10', workDuration: '8.25 h' },
  // supervisor本人の勤怠データも追加
  { date: '2025-07-12', name: 'ほんだなおと', clockIn: '08:55:00', clockOut: '19:00:00', workDuration: '10.08 h' },
];
const dummyRequests = [
  { id: 'req-1', userName: '田中 太郎', type: '打刻修正', date: '2025-07-12', content: '出勤時刻を09:10→09:00に修正希望', status: 'pending' },
  { id: 'req-2', userName: '佐藤 花子', type: '残業申請', date: '2025-07-11', content: '2時間残業申請', status: 'pending' },
];

// 申請フォーム用のシンプルなモーダルUI
const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#0008', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
};
const modalCardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 12, boxShadow: '0 2px 16px #0003', padding: 32, minWidth: 340, maxWidth: '90vw', width: 400
};

const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const now = useNow();
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const [clockOutTime, setClockOutTime] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attendances, setAttendances] = useState<any[]>([]);
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
    }
  }, [user]);

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
      {/* 申請ボタンエリア（カード風）: admin/employeeのみ */}
      {user?.role !== 'supervisor' && (
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
          <h2 style={{ fontWeight: 'bold', fontSize: 20, marginBottom: 18, color: '#222' }}>全従業員勤怠管理</h2>
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
                {dummyAttendance.map(a => (
                  <tr key={a.date + a.name}>
                    <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10 }}>{a.date}</td>
                    <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10 }}>{a.name}</td>
                    <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10, textAlign: 'center' }}>{a.clockIn}</td>
                    <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10, textAlign: 'center' }}>{a.clockOut}</td>
                    <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10, textAlign: 'center' }}>{a.workDuration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* 上司用: 部下の申請一覧 */}
      {user?.role === 'supervisor' && (
        <div style={{ maxWidth: 900, margin: '24px auto 0', background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px #0001', padding: 24 }}>
          <h2 style={{ fontWeight: 'bold', fontSize: 20, marginBottom: 18, color: '#222' }}>部下の申請一覧</h2>
          {dummyRequests.length === 0 ? (
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
                </tr>
              </thead>
              <tbody>
                {dummyRequests.map(r => (
                  <tr key={r.id}>
                    <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10 }}>{r.userName}</td>
                    <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10, textAlign: 'center' }}>{r.type}</td>
                    <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10, textAlign: 'center' }}>{r.date}</td>
                    <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10 }}>{r.content}</td>
                    <td style={{ borderBottom: '1px solid #f3f4f6', padding: 10, textAlign: 'center', color: '#eab308', fontWeight: 700 }}>{r.status === 'pending' ? '保留中' : r.status}</td>
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