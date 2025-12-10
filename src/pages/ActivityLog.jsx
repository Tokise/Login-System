import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, startAfter, getDocs } from 'firebase/firestore';
import { Clock, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { encryptData, decryptData } from '../utils/encryption';
import { useAuth } from '../context/AuthContext';

const ActivityLog = () => {
    const { encryptionKey } = useAuth(); // key from context
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastVisible, setLastVisible] = useState(null);
    const [page, setPage] = useState(1);
    const LOGS_PER_PAGE = 10;

    useEffect(() => {
        if (encryptionKey) {
            fetchLogs();
        }
    }, [encryptionKey]);

    const fetchLogs = async (startAfterDoc = null) => {
        if (!encryptionKey) return;
        setLoading(true);
        try {
            let q = query(
                collection(db, 'activity_logs'),
                orderBy('timestamp', 'desc'),
                limit(LOGS_PER_PAGE)
            );

            if (startAfterDoc) {
                q = query(
                    collection(db, 'activity_logs'),
                    orderBy('timestamp', 'desc'),
                    startAfter(startAfterDoc),
                    limit(LOGS_PER_PAGE)
                );
            }

            const documentSnapshots = await getDocs(q);
            const newLogs = [];
            documentSnapshots.forEach((doc) => {
                const data = doc.data();
                newLogs.push({
                    id: doc.id,
                    ...data,
                    action: decryptData(data.actionEncrypted, encryptionKey) || data.action,
                    details: decryptData(data.detailsEncrypted, encryptionKey) || data.details,
                    performedBy: decryptData(data.performedByEncrypted, encryptionKey) || data.performedBy
                });
            });

            setLogs(newLogs);
            setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);
        } catch (error) {
            console.error("Error fetching logs:", error);
        }
        setLoading(false);
    };

    const handleNextPage = () => {
        if (lastVisible) {
            setPage(prev => prev + 1);
            fetchLogs(lastVisible);
        }
    };

    // Note: Firestore pagination is 'forward only' efficiently without keeping track of all previous cursors.
    // For this simple demo, we implement Next only or Reset. Real apps manage a stack of cursors.
    const handleRefresh = () => {
        setPage(1);
        setLastVisible(null);
        fetchLogs();
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        return new Date(timestamp.seconds * 1000).toLocaleString();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Activity Logs</h1>
                <button
                    onClick={handleRefresh}
                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                >
                    Refresh
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-900">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Timestamp</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Details</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                            {logs.length === 0 && !loading ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-4 text-center text-slate-500">No activity logs found.</td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                            <div className="flex items-center">
                                                <Clock className="h-4 w-4 mr-2 text-slate-400" />
                                                {formatDate(log.timestamp)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">
                                            {log.performedBy}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-300">
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-800 truncate max-w-[150px]">
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                                            {log.details}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="bg-white dark:bg-slate-800 px-4 py-3 flex items-center justify-between border-t border-slate-200 dark:border-slate-700 sm:px-6">
                    <div className="flex-1 flex justify-between sm:hidden">
                        {/* Mobile pagination simplified */}
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-slate-700 dark:text-slate-400">
                                Page <span className="font-medium">{page}</span>
                            </p>
                        </div>
                        <div>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                <button
                                    onClick={handleRefresh}
                                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-medium text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700"
                                >
                                    <span className="sr-only">Reset</span>
                                    <ChevronLeft className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={handleNextPage}
                                    disabled={!lastVisible || logs.length < LOGS_PER_PAGE}
                                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-medium text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                                >
                                    <span className="sr-only">Next</span>
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ActivityLog;
