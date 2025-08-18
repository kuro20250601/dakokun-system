import { db } from './firebase';
import { collection, addDoc, Timestamp, query, where, getDocs, updateDoc, doc, orderBy } from 'firebase/firestore';
import { Request } from '../types';

export const clockIn = async (userId: string, userName: string) => {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  await addDoc(collection(db, 'attendances'), {
    userId,
    userName,
    clockIn: Timestamp.fromDate(today),
    clockOut: null,
    date: dateStr,
  });
};

export const clockOut = async (userId: string) => {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  // 今日の自分の出勤記録を検索
  const q = query(
    collection(db, 'attendances'),
    where('userId', '==', userId),
    where('date', '==', dateStr)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) throw new Error('本日の出勤記録が見つかりません');
  // 最初の1件だけ更新
  const attendanceDoc = snapshot.docs[0];
  await updateDoc(doc(db, 'attendances', attendanceDoc.id), {
    clockOut: Timestamp.fromDate(today),
  });
};

export const getAllAttendances = async () => {
  const q = query(collection(db, 'attendances'), orderBy('date', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// --- 通知（notifications）API ---

// 通知作成
export const createNotification = async (notification: {
  recipientId: string;
  title: string;
  message: string;
  type: 'request' | 'approval' | 'system';
  relatedRequestId?: string;
  isRead: boolean;
}) => {
  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, 'notifications'), {
    ...notification,
    createdAt: now,
  });
  return docRef.id;
};

// ユーザーの通知一覧取得
export const getNotificationsByUser = async (userId: string) => {
  const q = query(
    collection(db, 'notifications'),
    where('recipientId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// 通知を既読にする
export const markNotificationAsRead = async (notificationId: string) => {
  await updateDoc(doc(db, 'notifications', notificationId), {
    isRead: true,
  });
};

// 未読通知数を取得
export const getUnreadNotificationCount = async (userId: string) => {
  const q = query(
    collection(db, 'notifications'),
    where('recipientId', '==', userId),
    where('isRead', '==', false)
  );
  const snapshot = await getDocs(q);
  return snapshot.size;
};

// 申請作成（通知機能付き）
export const createRequest = async (request: Omit<Request, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, 'requests'), {
    ...request,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  });
  
  // 上長に通知を送信
  if (request.supervisorId) {
    await createNotification({
      recipientId: request.supervisorId,
      title: '新しい申請があります',
      message: `${request.userName}さんから${request.type}の申請が届きました。`,
      type: 'request',
      relatedRequestId: docRef.id,
      isRead: false,
    });
  }
  
  return docRef.id;
};

// ユーザーごとの申請一覧取得
export const getRequestsByUser = async (userId: string) => {
  const q = query(collection(db, 'requests'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// 上司ごとの部下申請一覧取得
export const getRequestsBySupervisor = async (supervisorId: string) => {
  const q = query(collection(db, 'requests'), where('supervisorId', '==', supervisorId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// 申請の承認・却下
export const updateRequestStatus = async (requestId: string, status: 'approved' | 'denied') => {
  const now = Timestamp.now();
  await updateDoc(doc(db, 'requests', requestId), {
    status,
    updatedAt: now,
  });
}; 