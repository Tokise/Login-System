import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';
import { Key, Save, AlertCircle } from 'lucide-react';

const Settings = () => {
    const { currentUser, userRole } = useAuth();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState({ type: '', text: '' });
    const [loading, setLoading] = useState(false);

    const handleChangePassword = async (e) => {
        // ... (unchanged)
        e.preventDefault();
        setMessage({ type: '', text: '' });

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match.' });
            return;
        }

        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!strongPasswordRegex.test(newPassword)) {
            setMessage({ type: 'error', text: 'Password must meet all strength requirements.' });
            return;
        }

        setLoading(true);
        try {
            const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
            await reauthenticateWithCredential(currentUser, credential);
            await updatePassword(currentUser, newPassword);
            setMessage({ type: 'success', text: 'Password updated successfully.' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            console.error(error);
            if (error.code === 'auth/wrong-password') {
                setMessage({ type: 'error', text: 'Current password is incorrect.' });
            } else {
                setMessage({ type: 'error', text: 'Failed to update password. ' + error.message });
            }
        }
        setLoading(false);
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header / Hero */}
            <div className="relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-slate-700">
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold mb-2 text-slate-900 dark:text-white">Account Settings</h1>
                        <p className="text-slate-600 dark:text-slate-400 text-lg opacity-90 max-w-2xl">
                            Manage your password and security references.
                        </p>
                    </div>
                    <div className="p-3 bg-indigo-50 dark:bg-white/10 rounded-full backdrop-blur-sm hidden md:block">
                        <Key className="w-8 h-8 text-indigo-600 dark:text-white" />
                    </div>
                </div>
                {/* Decorational background elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Navigation/Info (Future use, for now just profile snippet) */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                        <div className="flex flex-col items-center text-center">
                            <div className="h-20 w-20 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-2xl font-bold mb-4">
                                {currentUser?.email?.[0].toUpperCase()}
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{currentUser?.email}</h3>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 mt-2 capitalize">
                                {userRole ? userRole.replace('_', ' ') : 'Role Hidden'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right Column: Key Form */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                                <Key className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Change Password</h2>
                        </div>

                        <form onSubmit={handleChangePassword} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Current Password</label>
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="block w-full rounded-xl border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all py-2.5 px-4"
                                    required
                                    placeholder="Enter your current password"
                                />
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-700/50">
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">New Password</label>
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="block w-full rounded-xl border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all py-2.5 px-4"
                                            required
                                            placeholder="Enter strong new password"
                                        />
                                        <div className="mt-2">
                                            <PasswordStrengthMeter password={newPassword} />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Confirm New Password</label>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="block w-full rounded-xl border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all py-2.5 px-4"
                                            required
                                            placeholder="Repeat new password"
                                        />
                                    </div>
                                </div>
                            </div>

                            {message.text && (
                                <div className={`p-4 rounded-xl flex items-start ${message.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-200 border border-red-200 dark:border-red-800' : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-200 border border-green-200 dark:border-green-800'}`}>
                                    <AlertCircle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
                                    <span className="text-sm font-medium">{message.text}</span>
                                </div>
                            )}

                            <div className="flex justify-end pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex items-center px-6 py-2.5 border border-transparent rounded-xl shadow-lg shadow-indigo-500/20 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
                                >
                                    <Save className="h-4 w-4 mr-2" />
                                    {loading ? 'Updating...' : 'Update Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
