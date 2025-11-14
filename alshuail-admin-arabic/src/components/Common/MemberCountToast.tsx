/**
 * MemberCountToast Component
 *
 * Beautiful animated toast notification for member count changes
 * Shows when member count increases or decreases with smooth animations
 */

import React, { memo,  useEffect, useState } from 'react';

interface MemberCountToastProps {
    show: boolean;
    memberCount: number;
    previousCount: number | null;
    trend: 'increased' | 'decreased' | 'stable';
    changeAmount: number;
    onClose: () => void;
}

const MemberCountToast: React.FC<MemberCountToastProps> = ({
    show,
    memberCount,
    previousCount,
    trend,
    changeAmount,
    onClose
}) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (show) {
            setIsVisible(true);
            // Auto-dismiss after 5 seconds
            const timer = setTimeout(() => {
                setIsVisible(false);
                setTimeout(onClose, 300); // Wait for fade-out animation
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [show, onClose]);

    if (!show && !isVisible) return null;

    const getTrendIcon = () => {
        if (trend === 'increased') return '📈';
        if (trend === 'decreased') return '📉';
        return '📊';
    };

    const getTrendColor = () => {
        if (trend === 'increased') return 'from-green-500 to-emerald-600';
        if (trend === 'decreased') return 'from-orange-500 to-red-600';
        return 'from-blue-500 to-indigo-600';
    };

    const getTrendText = () => {
        if (trend === 'increased') return 'زيادة';
        if (trend === 'decreased') return 'نقصان';
        return 'تحديث';
    };

    return (
        <div
            className={`fixed top-20 right-6 z-50 transition-all duration-300 ${
                isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
            }`}
            dir="rtl"
        >
            <div className={`bg-gradient-to-r ${getTrendColor()} text-white rounded-xl shadow-2xl p-4 min-w-[320px] max-w-md`}>
                <div className="flex items-start gap-3">
                    <span className="text-3xl">{getTrendIcon()}</span>
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="font-bold text-lg">تحديث عدد الأعضاء</h4>
                            <button
                                onClick={() => {
                                    setIsVisible(false);
                                    setTimeout(onClose, 300);
                                }}
                                className="text-white hover:text-gray-200 text-xl leading-none"
                            >
                                ×
                            </button>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-bold">{memberCount}</span>
                                <span className="text-sm opacity-90">عضو نشط</span>
                            </div>
                            {previousCount !== null && changeAmount !== 0 && (
                                <div className="flex items-center gap-2 text-sm opacity-90">
                                    <span>{getTrendText()}:</span>
                                    <span className="font-semibold">
                                        {changeAmount > 0 ? '+' : ''}{changeAmount}
                                    </span>
                                    <span>عضو (من {previousCount})</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                {/* Progress bar animation */}
                <div className="mt-3 h-1 bg-white bg-opacity-30 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-white rounded-full animate-progress-bar"
                        style={{ animation: 'progress 5s linear forwards' }}
                    />
                </div>
            </div>
        </div>
    );
};

export default memo(MemberCountToast);
