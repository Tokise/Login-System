import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, UserCheck, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
    const { currentUser, userRole } = useAuth();

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl shadow-xl p-8 text-white">
                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold mb-2">
                        Welcome back, {currentUser?.email?.split('@')[0]}!
                    </h1>
                    <p className="text-indigo-100 text-lg opacity-90 max-w-2xl">
                        You are currently logged in with <span className="font-bold underline decoration-wavy decoration-indigo-300 capitalize text-white">{userRole?.replace('_', ' ')}</span> privileges.
                        Your system is secure and running smoothly.
                    </p>
                </div>
                {/* Decorational background elements */}
                <div className="absolute -top-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-black/10 rounded-full blur-2xl"></div>
            </div>

            {/* Stats / Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Security Card - Everyone sees this */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 p-6 flex items-center justify-between hover:shadow-xl transition-shadow duration-300 group">
                    <div>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">System Status</p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="flex h-3 w-3 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                            <span className="text-2xl font-bold text-slate-900 dark:text-white group-hover:text-green-600 transition-colors">Secure</span>
                        </div>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-xl">
                        <Shield className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                </div>

                {/* User Management Shortcut - Admins */}
                {(userRole === 'super_admin' || userRole === 'admin') && (
                    <Link to="/users" className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 p-6 flex items-center justify-between hover:shadow-xl hover:border-indigo-500/50 transition-all duration-300 group">
                        <div>
                            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">User Base</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 group-hover:text-indigo-600 transition-colors">Manage Users</p>
                        </div>
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl group-hover:scale-110 transition-transform">
                            <UserCheck className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                        </div>
                    </Link>
                )}

                {/* Logs Shortcut - Super Admin */}
                {userRole === 'super_admin' && (
                    <Link to="/activity" className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 p-6 flex items-center justify-between hover:shadow-xl hover:border-orange-500/50 transition-all duration-300 group">
                        <div>
                            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Audit Trails</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 group-hover:text-orange-600 transition-colors">Activity Logs</p>
                        </div>
                        <div className="p-3 bg-orange-50 dark:bg-orange-900/30 rounded-xl group-hover:scale-110 transition-transform">
                            <Activity className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                        </div>
                    </Link>
                )}
            </div>

            {/* Quick Tips or Info */}
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">Pro Tip</h3>
                <p className="text-blue-800 dark:text-blue-200 opacity-80">
                    Use the <strong>Theme Toggle</strong> in the sidebar to switch between Light and Dark modes.
                    Remember that your <strong>Master PIN</strong> is required to decrypt sensitive data during your session.
                </p>
            </div>
        </div>
    );
};

export default Dashboard;
