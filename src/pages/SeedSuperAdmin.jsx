import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { encryptData } from '../utils/encryption';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Save, AlertCircle } from 'lucide-react';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';

const SeedSuperAdmin = () => {
    const { currentUser } = useAuth(); // Get current user if already logged in
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSeed = async (e) => {
        e.preventDefault();
        setError('');

        if (!pin || pin.length < 4) {
            setError('Master PIN is required (min 4 chars) to encrypt the data.');
            return;
        }

        setLoading(true);
        try {
            let user;
            if (currentUser) {
                user = currentUser;
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                user = userCredential.user;
            }

            // 2. Prepare Encrypted Data using the PIN
            const userData = {
                emailEncrypted: encryptData(user.email, pin),
                roleEncrypted: encryptData('super_admin', pin),
                permissionsEncrypted: encryptData({ canAdd: true, canEdit: true, canView: true }, pin),
                createdAtEncrypted: encryptData(new Date().toISOString(), pin),
                createdByEncrypted: encryptData('SYSTEM_SEED', pin),
                isArchivedEncrypted: encryptData(false, pin),
                isLockedEncrypted: encryptData(false, pin),
                failedAttemptsEncrypted: encryptData(0, pin)
            };

            // 3. Save to Firestore
            await setDoc(doc(db, 'users', user.uid), userData);

            alert('Super Admin data saved successfully! You can now log in.');
            navigate('/login');
        } catch (err) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                setError("User already exists. Please Reload the page to detect your login.");
            } else {
                setError(err.message);
            }
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col justify-center items-center p-4">
            <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-lg shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="bg-indigo-600 p-4 flex items-center justify-center">
                    <Shield className="text-white h-8 w-8 mr-2" />
                    <h1 className="text-white text-xl font-bold">Seed Super Admin</h1>
                </div>

                <div className="p-6">
                    <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3 flex items-start">
                        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 mr-2 flex-shrink-0" />
                        <div className="text-sm text-amber-800 dark:text-amber-200">
                            <p className="font-bold">CRITICAL: Data Repair Mode</p>
                            <p>
                                If you are seeing "User" instead of "Super Admin", your Encryption PIN is mismatched.
                                <br />
                                1. Enter a PIN you will remember.
                                <br />
                                2. Click "Repair". This <strong>overwrites</strong> your cloud profile with this new PIN.
                                <br />
                                3. Sign Out completely.
                                <br />
                                4. Login and use <strong>THIS SAME PIN</strong> to unlock.
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSeed} className="space-y-4">
                        {currentUser ? (
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-center">
                                <p className="text-blue-800 dark:text-blue-200 font-bold mb-2">Logged In as {currentUser.email}</p>
                                <p className="text-sm text-blue-600 dark:text-blue-300">
                                    Click below to initialize/repair your Super Admin database entry.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                                        placeholder="admin@example.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                                        placeholder="Strong Password"
                                    />
                                    <PasswordStrengthMeter password={password} />
                                </div>
                            </>
                        )}

                        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                            <label className="block text-sm font-bold text-indigo-700 dark:text-indigo-400">
                                Set Master Database PIN
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-4 w-4 text-slate-400" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value)}
                                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-md py-2 dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                                    placeholder="e.g. Secret123"
                                />
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                                Choose a PIN/Passphrase. You MUST remember this to access the system.
                            </p>
                        </div>

                        {error && (
                            <div className="text-red-500 text-sm font-medium text-center">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            {loading ? 'Processing...' : (currentUser ? 'Repair / Initialize Database' : 'Create Super Admin & Encrypt')}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SeedSuperAdmin;
