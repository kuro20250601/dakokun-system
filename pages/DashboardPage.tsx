import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { TimeEntry, Role, Request as RequestType, RequestStatus, RequestType as ERequestType, AttendanceRecord } from '../types';
import { ClockIcon, CheckCircleIcon, XCircleIcon, PencilIcon, PlusCircleIcon, DownloadIcon } from '../components/Icons';

// --- Helper Functions ---
const formatTime = (date: Date) => date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
        case RequestStatus.Pending: return 'bg-yellow-100 text-yellow-800';
        case RequestStatus.Approved: return 'bg-green-100 text-green-800';
        case RequestStatus.Rejected: return 'bg-red-100 text-red-800';
    }
};

// --- Time Clock Component ---
const TimeClock: React.FC = () => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [todaysEntry, setTodaysEntry] = useState<TimeEntry | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();

    const fetchTodaysEntry = useCallback(async () => {
        if (!user) return;
        try {
            setIsLoading(true);
            const entry = await api.getTodaysEntry(user.id);
            setTodaysEntry(entry);
        } catch (e) {
            setError('今日の打刻データの取得に失敗しました。');
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchTodaysEntry();
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, [fetchTodaysEntry]);
    
    const handleClockIn = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            await api.clockIn(user.id);
            await fetchTodaysEntry();
        } catch(e) {
            setError('出勤処理に失敗しました。');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClockOut = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            await api.clockOut(user.id);
            await fetchTodaysEntry();
        } catch(e) {
            setError('退勤処理に失敗しました。');
        } finally {
            setIsLoading(false);
        }
    };
    
    const canClockIn = !todaysEntry?.clockIn;
    const canClockOut = todaysEntry?.clockIn && !todaysEntry?.clockOut;

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <h2 className="text-xl font-bold text-gray-700 mb-2">タイムレコーダー</h2>
            <div className="text-5xl font-bold text-primary my-4">{formatTime(currentTime)}</div>
            <p className="text-gray-500 mb-6">{formatDate(currentTime.toISOString())}</p>
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button onClick={handleClockIn} disabled={!canClockIn || isLoading} className="w-full bg-primary text-white font-bold py-4 px-4 rounded-lg shadow-md hover:bg-primary-dark transition-transform transform hover:scale-105 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:scale-100">出勤</button>
                <button onClick={handleClockOut} disabled={!canClockOut || isLoading} className="w-full bg-secondary text-white font-bold py-4 px-4 rounded-lg shadow-md hover:bg-gray-600 transition-transform transform hover:scale-105 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:scale-100">退勤</button>
            </div>
            {isLoading && <p className="mt-4 text-sm text-gray-500">処理中...</p>}
            <div className="mt-6 text-left bg-gray-50 p-4 rounded-lg">
                <h3 className="font-bold text-gray-600 mb-2">本日の打刻</h3>
                <div className="flex justify-between text-gray-800">
                    <span>出勤:</span>
                    <span className="font-mono">{todaysEntry?.clockIn ? formatTime(new Date(todaysEntry.clockIn)) : '--:--:--'}</span>
                </div>
                <div className="flex justify-between text-gray-800 mt-1">
                    <span>退勤:</span>
                    <span className="font-mono">{todaysEntry?.clockOut ? formatTime(new Date(todaysEntry.clockOut)) : '--:--:--'}</span>
                </div>
            </div>
        </div>
    );
}

// --- Request Form Modal ---
interface RequestFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    requestType: ERequestType;
    onSuccess: () => void;
}

const RequestFormModal: React.FC<RequestFormModalProps> = ({ isOpen, onClose, requestType, onSuccess }) => {
    const { user } = useAuth();
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState('09:00');
    const [reason, setReason] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !reason) {
            setError('理由を必ず入力してください。');
            return;
        }
        setError('');
        setIsLoading(true);
        try {
            await api.createRequest(user.id, requestType, date, time, reason);
            onSuccess();
            onClose();
        } catch (err) {
            setError('申請の送信に失敗しました。');
        } finally {
            setIsLoading(false);
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-6 border-b">
                    <h3 className="text-xl font-semibold text-gray-800">{requestType === ERequestType.Correction ? '打刻修正申請' : '残業申請'}</h3>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">日付</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" required />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-700">時刻</label>
                            <input type="time" value={time} onChange={e => setTime(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">理由</label>
                            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={4} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" required placeholder="修正理由や残業内容を具体的に入力してください。"></textarea>
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                    </div>
                    <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
                         <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">キャンセル</button>
                         <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary-dark disabled:bg-gray-400">
                            {isLoading ? '送信中...' : '申請する'}
                         </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- Views for Each Role ---
const EmployeeView: React.FC = () => {
    const { user } = useAuth();
    const [attendanceHistory, setAttendanceHistory] = useState<TimeEntry[]>([]);
    const [isCorrectionModalOpen, setCorrectionModalOpen] = useState(false);
    const [isOvertimeModalOpen, setOvertimeModalOpen] = useState(false);
    
    useEffect(() => {
        if (user) {
            api.getUserAttendance(user.id).then(setAttendanceHistory);
        }
    }, [user]);

    return (
        <div className="space-y-6">
            <TimeClock />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <button onClick={() => setCorrectionModalOpen(true)} className="flex items-center justify-center w-full bg-white text-primary font-bold py-3 px-4 rounded-lg shadow-md border border-primary hover:bg-primary-light hover:text-primary-dark transition-all">
                    <PencilIcon className="h-5 w-5 mr-2" />
                    打刻修正申請
                 </button>
                 <button onClick={() => setOvertimeModalOpen(true)} className="flex items-center justify-center w-full bg-white text-warning font-bold py-3 px-4 rounded-lg shadow-md border border-warning hover:bg-yellow-50 transition-all">
                    <PlusCircleIcon className="h-5 w-5 mr-2" />
                    残業申請
                 </button>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-700 mb-4">勤怠履歴</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3">日付</th>
                                <th scope="col" className="px-6 py-3">出勤</th>
                                <th scope="col" className="px-6 py-3">退勤</th>
                            </tr>
                        </thead>
                        <tbody>
                            {attendanceHistory.slice(0, 5).map(entry => (
                                <tr key={entry.id} className="bg-white border-b">
                                    <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{formatDate(entry.date)}</th>
                                    <td className="px-6 py-4 font-mono">{entry.clockIn ? formatTime(new Date(entry.clockIn)) : '-'}</td>
                                    <td className="px-6 py-4 font-mono">{entry.clockOut ? formatTime(new Date(entry.clockOut)) : '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <RequestFormModal isOpen={isCorrectionModalOpen} onClose={() => setCorrectionModalOpen(false)} requestType={ERequestType.Correction} onSuccess={() => {}} />
            <RequestFormModal isOpen={isOvertimeModalOpen} onClose={() => setOvertimeModalOpen(false)} requestType={ERequestType.Overtime} onSuccess={() => {}} />

        </div>
    );
};

const SupervisorView: React.FC = () => {
    const { user } = useAuth();
    const [requests, setRequests] = useState<RequestType[]>([]);
    const [teamAttendance, setTeamAttendance] = useState<AttendanceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const [managedRequests, managedAttendance] = await Promise.all([
                api.getManagedRequests(user.id),
                api.getManagedTeamAttendance(user.id),
            ]);
            setRequests(managedRequests);
            setTeamAttendance(managedAttendance);
        } catch (error) {
            console.error("Failed to fetch supervisor data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRequestUpdate = async (requestId: string, status: RequestStatus) => {
        if (!user) return;
        await api.updateRequestStatus(requestId, status, user.id);
        fetchData(); // Re-fetch to update the list
    };

    return (
        <div className="space-y-6 mt-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-700 mb-4">部下の申請一覧</h3>
                {isLoading ? <p>読込中...</p> : (
                    <div className="space-y-4">
                        {requests.length > 0 ? requests.map(req => (
                            <div key={req.id} className="border rounded-lg p-4 bg-gray-50">
                                <div className="flex flex-wrap items-center justify-between">
                                    <div>
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(req.status)}`}>{req.status}</span>
                                        <span className="ml-2 font-bold text-gray-800">{req.userName}</span>
                                        <span className="ml-2 text-sm text-gray-600">({req.type === ERequestType.Correction ? '打刻修正' : '残業'})</span>
                                    </div>
                                    <div className="text-sm text-gray-500 mt-2 sm:mt-0">{new Date(req.createdAt).toLocaleDateString()}</div>
                                </div>
                                <p className="mt-2 text-gray-800">
                                    {req.date} の {req.requestedTime} に関する申請
                                </p>
                                <p className="mt-1 text-sm text-gray-600 bg-white p-2 rounded">理由: {req.reason}</p>
                                {req.status === RequestStatus.Pending && (
                                    <div className="mt-3 flex justify-end space-x-2">
                                        <button onClick={() => handleRequestUpdate(req.id, RequestStatus.Approved)} className="flex items-center px-3 py-1 text-sm text-white bg-success rounded hover:bg-green-600">
                                            <CheckCircleIcon className="h-4 w-4 mr-1" />承認
                                        </button>
                                        <button onClick={() => handleRequestUpdate(req.id, RequestStatus.Rejected)} className="flex items-center px-3 py-1 text-sm text-white bg-danger rounded hover:bg-red-600">
                                            <XCircleIcon className="h-4 w-4 mr-1" />否認
                                        </button>
                                    </div>
                                )}
                            </div>
                        )) : <p className="text-gray-500">保留中の申請はありません。</p>}
                    </div>
                )}
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-700 mb-4">部下の勤怠履歴</h3>
                {isLoading ? <p>読込中...</p> : (
                    teamAttendance.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3">日付</th>
                                        <th className="px-6 py-3">社員名</th>
                                        <th className="px-6 py-3">出勤</th>
                                        <th className="px-6 py-3">退勤</th>
                                        <th className="px-6 py-3">労働時間</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {teamAttendance.map(rec => (
                                        <tr key={rec.id} className="bg-white border-b">
                                            <td className="px-6 py-4">{rec.date}</td>
                                            <td className="px-6 py-4 font-medium text-gray-900">{rec.userName}</td>
                                            <td className="px-6 py-4 font-mono">{rec.clockIn ? formatTime(new Date(rec.clockIn)) : '-'}</td>
                                            <td className="px-6 py-4 font-mono">{rec.clockOut ? formatTime(new Date(rec.clockOut)) : '-'}</td>
                                            <td className="px-6 py-4 font-mono">{rec.workDuration !== null ? `${rec.workDuration.toFixed(2)} h` : '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : <p className="text-gray-500">部下の勤怠履歴はありません。</p>
                )}
            </div>
        </div>
    );
};

const AdminView: React.FC = () => {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('');

    const fetchAllRecords = useCallback(async () => {
        setIsLoading(true);
        const allRecords = await api.getAllAttendanceRecords();
        setRecords(allRecords);
        setFilteredRecords(allRecords);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchAllRecords();
    }, [fetchAllRecords]);

    useEffect(() => {
        const lowercasedFilter = filter.toLowerCase();
        const newFiltered = records.filter(record => 
            record.userName.toLowerCase().includes(lowercasedFilter) ||
            record.date.includes(lowercasedFilter)
        );
        setFilteredRecords(newFiltered);
    }, [filter, records]);

    const handleExport = async () => {
        await api.exportAttendanceToCSV(filteredRecords);
    }

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
            <div className="flex flex-wrap justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-700">全従業員勤怠管理</h3>
                <div className="flex items-center space-x-2 mt-2 sm:mt-0">
                    <input 
                        type="text" 
                        placeholder="名前 or 日付で検索..." 
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <button onClick={handleExport} className="flex items-center px-3 py-2 text-sm text-white bg-success rounded-md hover:bg-green-600">
                        <DownloadIcon className="h-4 w-4 mr-1" />CSV出力
                    </button>
                </div>
            </div>
             {isLoading ? <p>読込中...</p> : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th className="px-6 py-3">日付</th>
                                <th className="px-6 py-3">社員名</th>
                                <th className="px-6 py-3">出勤</th>
                                <th className="px-6 py-3">退勤</th>
                                <th className="px-6 py-3">労働時間</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRecords.map(rec => (
                                <tr key={rec.id} className="bg-white border-b">
                                    <td className="px-6 py-4">{rec.date}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{rec.userName}</td>
                                    <td className="px-6 py-4 font-mono">{rec.clockIn ? formatTime(new Date(rec.clockIn)) : '-'}</td>
                                    <td className="px-6 py-4 font-mono">{rec.clockOut ? formatTime(new Date(rec.clockOut)) : '-'}</td>
                                    <td className="px-6 py-4 font-mono">{rec.workDuration !== null ? `${rec.workDuration.toFixed(2)} h` : '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             )}
        </div>
    );
};


// --- Main Dashboard Component ---
const DashboardPage: React.FC = () => {
    const { user } = useAuth();
    
    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                <EmployeeView />
                {(user?.role === Role.Supervisor || user?.role === Role.Admin) && <SupervisorView />}
                {user?.role === Role.Admin && <AdminView />}
            </div>
        </div>
    );
};

export default DashboardPage;