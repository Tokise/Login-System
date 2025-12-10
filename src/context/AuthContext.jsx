import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import Swal from 'sweetalert2';
import { auth, db } from '../firebase';
import { encryptData, decryptData } from '../utils/encryption';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signInAnonymously,
    getAuth,
    signOut,
    updateProfile
} from 'firebase/auth';
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp,
    collection,
    query,
    where,
    getDocs
} from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState(null); // 'super_admin', 'admin', 'user'
    const [userPermissions, setUserPermissions] = useState(null); // { add: bool, view: bool, edit: bool }
    const [loading, setLoading] = useState(true);
    const [sessionTimeout, setSessionTimeout] = useState(null);
    const [encryptionKey, setEncryptionKey] = useState(null);

    // Constants
    const MAX_LOGIN_ATTEMPTS = 3;
    const SESSION_DURATION = 5 * 60 * 1000; // 5 minutes

    // Activity Monitor for Session Timeout
    const resetSessionTimer = () => {
        if (sessionTimeout) clearTimeout(sessionTimeout);
        if (currentUser) {
            const timer = setTimeout(() => {
                console.log('Session timed out due to inactivity.');
                logout();
            }, SESSION_DURATION);
            setSessionTimeout(timer);
        }
    };

    useEffect(() => {
        const events = ['click', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        const handleActivity = () => resetSessionTimer();

        if (currentUser) {
            events.forEach(event => window.addEventListener(event, handleActivity));
            resetSessionTimer(); // Start timer
        }

        return () => {
            events.forEach(event => window.removeEventListener(event, handleActivity));
            if (sessionTimeout) clearTimeout(sessionTimeout);
        };
    }, [currentUser]);

    // Auth State Listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setCurrentUser(user);
                // We do NOT fetch profile here anymore preventing premature decryption failure.
                // We wait for the 'loadUserProfile' effect below.
            } else {
                setCurrentUser(null);
                setUserRole(null);
                setUserPermissions(null);
                setEncryptionKey(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    // Load Profile when User AND Key are available (or just User for raw check)
    // We prefer waiting for Key to avoid showing "User" then flashing "Super Admin"
    // BUT we need to support the case where we don't have a key yet (to show Unlock screen).
    useEffect(() => {
        const loadUserProfile = async () => {
            if (!currentUser) return;

            // If we have a user but no key, we can't decrypt roles yet.
            // We can check if the doc exists, but we can't read encrypted fields.
            if (!encryptionKey) {
                // Determine if we should wait or invalidly set role?
                // For safety, we keep role null or 'guest' until unlocked.
                return;
            }

            try {
                const userDocRef = doc(db, 'users', currentUser.uid);
                const userDoc = await getDoc(userDocRef);

                if (userDoc.exists()) {
                    const rawData = userDoc.data();

                    // Decrypt sensitive fields
                    // Note: If decryption fails (wrong key), these return null.
                    const role = decryptData(rawData.roleEncrypted, encryptionKey);
                    const permissions = decryptData(rawData.permissionsEncrypted, encryptionKey);

                    // If role is null after decryption attempt with a Key, it means Key is WRONG.
                    // However, we rely on 'User' fallback if we want to allow partial access? 
                    // No, for this app, 'Super Admin' is critical.

                    if (role) setUserRole(role);
                    if (permissions) setUserPermissions(permissions);

                    // Optional: Check locks (would need to assume 'false' if decrypt fails or block access)
                    const isLockedEncrypted = decryptData(rawData.isLockedEncrypted, encryptionKey);
                    const isArchivedEncrypted = decryptData(rawData.isArchivedEncrypted, encryptionKey);

                    // Hybrid Check: Use Encrypted if available, otherwise check Plain (set by System)
                    const isLocked = isLockedEncrypted === true || rawData.isLocked === true;
                    const isArchived = isArchivedEncrypted === true || rawData.isArchived === true;

                    if (isLocked || isArchived) {
                        await signOut(auth);
                        setEncryptionKey(null);
                        setCurrentUser(null);
                        await Swal.fire({
                            icon: 'error',
                            title: 'Access Denied',
                            text: 'Your account has been locked or archived. Please contact the Super Admin.',
                            confirmButtonColor: '#d33'
                        });
                        return;
                    }

                    // Update last login
                    await updateDoc(userDocRef, {
                        lastLoginEncrypted: encryptData(new Date().toISOString(), encryptionKey)
                    });
                }
            } catch (error) {
                console.error("Error loading profile:", error);
            }
        };

        loadUserProfile();
    }, [currentUser, encryptionKey]);

    // Login Function with Lockout Logic
    // Login Function with Lockout Logic
    const login = async (email, password) => {
        const normalizedEmail = email.toLowerCase().trim();

        // Check Lockout via LocalStorage (Client-side fallback)
        const lockoutTime = localStorage.getItem(`lockout_${normalizedEmail}`);
        if (lockoutTime && new Date().getTime() < parseInt(lockoutTime)) {
            const remainingTime = Math.ceil((parseInt(lockoutTime) - new Date().getTime()) / 60000);
            await Swal.fire({
                icon: 'error',
                title: 'Account Locked',
                text: `Too many failed attempts. Try again in ${remainingTime} minutes.`,
                confirmButtonColor: '#ef4444'
            });
            throw new Error(`Account is locked. Try again in ${remainingTime} minutes.`);
        }

        try {
            await signInWithEmailAndPassword(auth, email, password);
            // Success: Clear attempts
            localStorage.removeItem(`attempts_${normalizedEmail}`);
            localStorage.removeItem(`lockout_${normalizedEmail}`);

            await Swal.fire({
                icon: 'success',
                title: 'Welcome Back!',
                text: 'Login successful.',
                timer: 1500,
                showConfirmButton: false
            });
            return true;
        } catch (error) {
            console.error("Login failed", error);

            // Handle Attempts
            const currentAttempts = parseInt(localStorage.getItem(`attempts_${normalizedEmail}`) || '0');
            const newAttempts = currentAttempts + 1;
            localStorage.setItem(`attempts_${normalizedEmail}`, newAttempts.toString());

            let errorMessage = "Invalid email or password.";
            let remaining = MAX_LOGIN_ATTEMPTS - newAttempts;

            if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
                // Lock for 15 minutes
                const lockoutTimestamp = new Date().getTime() + (15 * 60 * 1000);
                localStorage.setItem(`lockout_${normalizedEmail}`, lockoutTimestamp);
                errorMessage = "Account locked due to too many failed attempts. Try again in 15 minutes.";

                await Swal.fire({
                    icon: 'error',
                    title: 'Account Locked',
                    text: errorMessage,
                    confirmButtonColor: '#ef4444'
                });
            } else {
                await Swal.fire({
                    icon: 'warning',
                    title: 'Login Failed',
                    text: `Invalid credentials. You have ${remaining} attempts remaining before lockout.`,
                    confirmButtonColor: '#ef4444'
                });
            }
            // Throw specific error message so Login.jsx can display it
            throw new Error(errorMessage);
        }
    };

    const logout = () => {
        setEncryptionKey(null);
        return signOut(auth);
    };

    const validateEncryptionKey = (key) => {
        setEncryptionKey(key);
    };

    const value = {
        currentUser,
        userRole,
        userPermissions,
        login,
        logout,
        encryptionKey,
        validateEncryptionKey
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
