import React from 'react';
import { Check, X } from 'lucide-react';

const PasswordStrengthMeter = ({ password }) => {
    const criteria = [
        { label: 'At least 8 characters', valid: password.length >= 8 },
        { label: 'Contains uppercase letter', valid: /[A-Z]/.test(password) },
        { label: 'Contains lowercase letter', valid: /[a-z]/.test(password) },
        { label: 'Contains number', valid: /[0-9]/.test(password) },
        { label: 'Contains special character', valid: /[^A-Za-z0-9]/.test(password) },
    ];

    const validCount = criteria.filter(c => c.valid).length;

    let strength = 'Weak';
    let color = 'bg-red-500';

    if (validCount >= 3) {
        strength = 'Medium';
        color = 'bg-yellow-500';
    }
    if (validCount === 5) {
        strength = 'Strong';
        color = 'bg-green-500';
    }

    return (
        <div className="space-y-2 mt-2">
            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                    className={`h-full transition-all duration-300 ${color}`}
                    style={{ width: `${(validCount / 5) * 100}%` }}
                ></div>
            </div>
            <p className={`text-xs font-semibold ${color.replace('bg-', 'text-')}`}>
                Strength: {strength}
            </p>

            {/* Criteria List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                {criteria.map((item, index) => (
                    <div key={index} className="flex items-center text-xs">
                        {item.valid ? (
                            <Check className="h-3 w-3 text-green-500 mr-1" />
                        ) : (
                            <X className="h-3 w-3 text-slate-300 mr-1" />
                        )}
                        <span className={item.valid ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400'}>
                            {item.label}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PasswordStrengthMeter;
