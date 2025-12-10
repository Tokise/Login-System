import React, { useState } from 'react';
import { Lock, Unlock, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SecurityUnlock = () => {
    const { validateEncryptionKey } = useAuth();
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');

    const handleUnlock = () => {
        if (!pin || pin.length < 4) {
            setError('PIN must be at least 4 characters');
            return;
        }
        // In a real scenario, we might try to decrypt a known "canary" string 
        // to verify if the PIN is correct. 
        // For now, we trust the user knows what they are doing and just set it.
        // If they set the wrong PIN, they will see garbage data.

        validateEncryptionKey(pin);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="p-4 bg-indigo-100 dark:bg-indigo-900/50 rounded-full">
                        <Lock className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Security Unlock</h2>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">
                            Enter your Master Database PIN to decrypt your session.
                        </p>
                    </div>

                    <div className="w-full space-y-4 mt-4">
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3 flex items-start text-left">
                            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 mr-2 flex-shrink-0" />
                            <p className="text-sm text-amber-800 dark:text-amber-200">
                                This key is stored in memory only. If you refresh the page, you must enter it again.
                            </p>
                        </div>

                        <input
                            type="password"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            placeholder="Enter Master PIN..."
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                            onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                        />

                        {error && (
                            <p className="text-red-500 text-sm font-medium">{error}</p>
                        )}

                        <button
                            onClick={handleUnlock}
                            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-indigo-500/20"
                        >
                            <Unlock className="w-5 h-5" />
                            <span>Unlock Database</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SecurityUnlock;
