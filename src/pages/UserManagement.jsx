import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { db, auth } from '../firebase';
import { encryptData, decryptData } from '../utils/encryption';
// BUT for this frontend-only demo, we literally cannot create a user with a specific UID or password without logging in as them.
// The standard pattern for client-side only "Admin creates User" is:
// 1. Secondary App instance (complex) OR
// 2. Just create a Firestore document and let them "claim" it? No.
// 3. We will try to use the "standard" `createUserWithEmailAndPassword` BUT that logs the current user out.
// SOLUTION: We will have to Accept that creating a user logs the admin out, OR we just simulate it by creating the Firestore doc
// and telling the "User" to "Sign Up" via a hidden page?
// Wait, prompt says "super admin can create ... account". 
// A common workaround in strictly client scenarios is using a secondary Firebase App instance.
// I will implement a helper utility for this.

import { collection, query, getDocs, doc, setDoc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword } from 'firebase/auth'; // We'll need a way to restore session?
import { initializeApp } from 'firebase/app';
// We need to import config to init secondary app
// Wait, I can't import config from firebase.js easily if it's not exported. 
// I'll just use the regular auth and warn the user, or try the secondary app trick if I can read the config constants.
// Actually, `firebase.js` uses `import.meta.env`. I can re-use that.

import { useAuth } from '../context/AuthContext';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';
import {
    Users, UserPlus, Edit2, Archive, Unlock, ShieldAlert, X, Check, Loader2, LogIn
} from 'lucide-react';

// Re-init for secondary auth to avoid logging out current admin
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const secondaryApp = initializeApp(firebaseConfig, "Secondary");
const secondaryAuth = getAuth(secondaryApp);

const UserManagement = () => {
    const { userRole, userPermissions, currentUser, encryptionKey } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        role: 'user', // 'admin', 'user'
        permissions: {
            canAdd: false,
            canEdit: false,
            canView: true // Always true per requirements
        }
    });

    const canCreate = userRole === 'super_admin' || (userRole === 'admin' && userPermissions?.canAdd);
    const canEdit = userRole === 'super_admin' || (userRole === 'admin' && userPermissions?.canEdit);
    // view is assumed if they can access this page

    useEffect(() => {
        if (encryptionKey) {
            fetchUsers();
        }
    }, [encryptionKey]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'users'));
            const querySnapshot = await getDocs(q);
            const userList = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                userList.push({
                    id: doc.id,
                    email: decryptData(data.emailEncrypted, encryptionKey) || data.email,
                    role: decryptData(data.roleEncrypted, encryptionKey) || data.role,
                    permissions: decryptData(data.permissionsEncrypted, encryptionKey) || data.permissions,
                    isLocked: decryptData(data.isLockedEncrypted, encryptionKey) || data.isLocked,
                    isArchived: decryptData(data.isArchivedEncrypted, encryptionKey) || data.isArchived,
                });
            });
            setUsers(userList);

            // Check for locked users and notify
            const lockedCount = userList.filter(u => u.isLocked).length;
            if (lockedCount > 0) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Action Needed',
                    text: `${lockedCount} account(s) are currently locked and require attention.`,
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 5000
                });
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        }
        setLoading(false);
    };

    const handleOpenModal = (user = null) => {
        if (user) {
            setIsEditing(true);
            setSelectedUser(user);
            setFormData({
                email: user.email,
                password: '', // Can't view password, only reset if needed
                role: user.role,
                permissions: user.permissions || { canAdd: false, canEdit: false, canView: true }
            });
        } else {
            setIsEditing(false);
            setSelectedUser(null);
            setFormData({
                email: '',
                password: '',
                role: 'user',
                permissions: { canAdd: false, canEdit: false, canView: true }
            });
        }
        setModalOpen(true);
    };

    const handlePermissionChange = (perm) => {
        setFormData(prev => ({
            ...prev,
            permissions: { ...prev.permissions, [perm]: !prev.permissions[perm] }
        }));
    };

    const handleRoleChange = (role) => {
        setFormData(prev => ({ ...prev, role }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canCreate && !isEditing) return;
        if (!canEdit && isEditing) return;

        try {
            let uid;

            if (isEditing) {
                uid = selectedUser.id;
                // Update Firestore only (cannot update Auth email/password easily without user login)
                // Ideally we'd use a Cloud Function. Here we just update the DB record + permissions.
                await updateDoc(doc(db, 'users', uid), {
                    roleEncrypted: encryptData(formData.role, encryptionKey),
                    permissionsEncrypted: encryptData(formData.permissions, encryptionKey)
                });
                // Log action
                await logActivity('EDIT_USER', `Updated user ${selectedUser.email}`);
            } else {
                // Create in Auth (secondary)
                const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
                uid = userCredential.user.uid;

                // Create SHA-256 hash of email for lookup
                const emailHash = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(formData.email.toLowerCase().trim()));
                const emailHashArray = Array.from(new Uint8Array(emailHash));
                const emailHashHex = emailHashArray.map(b => b.toString(16).padStart(2, '0')).join('');

                // Create in Firestore with Encrypted Data
                await setDoc(doc(db, 'users', uid), {
                    emailEncrypted: encryptData(formData.email, encryptionKey),
                    emailHash: emailHashHex, // Searchable, but opaque
                    roleEncrypted: encryptData(formData.role, encryptionKey),
                    permissionsEncrypted: encryptData(formData.permissions, encryptionKey),
                    createdAt: serverTimestamp(),
                    createdByEncrypted: encryptData(currentUser.email, encryptionKey),
                    isArchivedEncrypted: encryptData(false, encryptionKey),
                    isLockedEncrypted: encryptData(false, encryptionKey),
                    failedAttemptsEncrypted: encryptData(0, encryptionKey)
                });
                // Log action
                await logActivity('CREATE_USER', `Created user ${formData.email}`);
            }

            setModalOpen(false);
            fetchUsers();

            await Swal.fire({
                icon: 'success',
                title: isEditing ? 'User Updated' : 'User Created',
                text: isEditing ? `Successfully updated ${selectedUser.email}` : `Successfully created ${formData.email}`,
                timer: 2000,
                showConfirmButton: false
            });

        } catch (error) {
            console.error("Error saving user:", error);
            await Swal.fire({
                icon: 'error',
                title: 'Operation Failed',
                text: error.message,
                confirmButtonColor: '#ef4444'
            });
        }
    };

    const handleArchive = async (user) => {
        const result = await Swal.fire({
            title: user.isArchived ? 'Unarchive User?' : 'Archive User?',
            text: `Are you sure you want to ${user.isArchived ? 'unarchive' : 'archive'} ${user.email}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: user.isArchived ? '#10b981' : '#f59e0b',
            cancelButtonColor: '#64748b',
            confirmButtonText: user.isArchived ? 'Yes, Unarchive' : 'Yes, Archive'
        });

        if (!result.isConfirmed) return;

        try {
            await updateDoc(doc(db, 'users', user.id), {
                isArchivedEncrypted: encryptData(!user.isArchived, encryptionKey)
            });
            await logActivity(user.isArchived ? 'UNARCHIVE_USER' : 'ARCHIVE_USER', `Archived/Unarchived ${user.email}`);

            fetchUsers();

            Swal.fire(
                user.isArchived ? 'Unarchived!' : 'Archived!',
                `User has been ${user.isArchived ? 'unarchived' : 'archived'}.`,
                'success'
            );
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Failed to update user status.', 'error');
        }
    };

    const handleUnlock = async (user) => {
        try {
            await updateDoc(doc(db, 'users', user.id), {
                isLockedEncrypted: encryptData(false, encryptionKey),
                failedAttemptsEncrypted: encryptData(0, encryptionKey)
            });
            await logActivity('UNLOCK_USER', `Unlocked ${user.email}`);
            fetchUsers();
        } catch (error) {
            console.error(error);
        }
    };

    const logActivity = async (action, details) => {
        try {
            await setDoc(doc(collection(db, 'activity_logs')), {
                actionEncrypted: encryptData(action, encryptionKey),
                detailsEncrypted: encryptData(details, encryptionKey),
                performedByEncrypted: encryptData(currentUser.email, encryptionKey),
                timestamp: serverTimestamp()
            });
        } catch (e) {
            console.error("Failed to log", e);
        }
    }

    // Permission Checks UI Helper
    const canPerformAction = (action) => {
        if (userRole === 'super_admin') return true;
        if (userRole !== 'admin') return false;
        if (action === 'create') return userPermissions?.canAdd;
        if (action === 'edit') return userPermissions?.canEdit;
        // Admin should adhere to their restriction. 
        // Prompt says: "Admin Role: Restriction (Add & View)" -> Can Add, AND View. implicitly NO Edit.
        return false;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">User Management</h1>
                {canCreate && (
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                        <UserPlus className="h-5 w-5 mr-2" />
                        Add User
                    </button>
                )}
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-900">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Permissions</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                        {users.map((user) => (
                            <tr key={user.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                                            {user.email[0].toUpperCase()}
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-slate-900 dark:text-white">{user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {user.isLocked ? (
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Locked</span>
                                    ) : user.isArchived ? (
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">Archived</span>
                                    ) : (
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Active</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                                    {user.role === 'super_admin' ? 'All Access' : (
                                        <div className="flex flex-col">
                                            {user.permissions?.canAdd && <span>• Add Users</span>}
                                            {user.permissions?.canEdit && <span>• Edit Users</span>}
                                            {user.permissions?.canView && <span>• View Users</span>}
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    {canEdit && (
                                        <button onClick={() => handleOpenModal(user)} className="text-indigo-600 hover:text-indigo-900 mr-4" title="Edit">
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                    )}
                                    {canEdit && ( // Archiving usually part of editing privileges or separate? Assume Edit includes Archive
                                        <button onClick={() => handleArchive(user)} className="text-orange-600 hover:text-orange-900 mr-4" title={user.isArchived ? "Unarchive" : "Archive"}>
                                            <Archive className="h-4 w-4" />
                                        </button>
                                    )}
                                    {canEdit && user.isLocked && (
                                        <button onClick={() => handleUnlock(user)} className="text-green-600 hover:text-green-900" title="Unlock">
                                            <Unlock className="h-4 w-4" />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                {isEditing ? 'Edit User' : 'Create User'}
                            </h2>
                            <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-500">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    disabled={isEditing}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                                    required
                                />
                            </div>

                            {!isEditing && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                                        required={!isEditing}
                                    />
                                    <PasswordStrengthMeter password={formData.password} />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Role</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => handleRoleChange(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-indigo-500"
                                >
                                    <option value="user">Regular User</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>

                            {formData.role !== 'super_admin' && (
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Restrictions</p>
                                    <div className="flex items-center space-x-4">
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={formData.permissions.canAdd}
                                                onChange={() => handlePermissionChange('canAdd')}
                                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">Can Add</span>
                                        </label>
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={formData.permissions.canEdit}
                                                onChange={() => handlePermissionChange('canEdit')}
                                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">Can Edit</span>
                                        </label>
                                        <label className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={formData.permissions.canView}
                                                disabled
                                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 opacity-50"
                                            />
                                            <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">Can View (Always)</span>
                                        </label>
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                {isEditing ? 'Save Changes' : 'Create User'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
