// Date and formatting utilities for Al-Shuail Family App

const generateHijriDate = (date = new Date()) => {
    try {
        // استخدام Intl.DateTimeFormat للتاريخ الهجري
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            calendar: 'islamic-umalqura',
            locale: 'ar-SA'
        };
        return new Intl.DateTimeFormat('ar-SA', options).format(date);
    } catch (error) {
        console.error('Error generating Hijri date:', error);
        return 'غير متوفر';
    }
};

const formatSAR = (amount) => {
    try {
        return new Intl.NumberFormat('ar-SA', {
            style: 'currency',
            currency: 'SAR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    } catch (error) {
        console.error('Error formatting SAR:', error);
        return `${amount} ريال`;
    }
};

const formatDate = (date, locale = 'ar-SA') => {
    try {
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        };
        return new Intl.DateTimeFormat(locale, options).format(new Date(date));
    } catch (error) {
        console.error('Error formatting date:', error);
        return date.toString();
    }
};

const formatTime = (time, locale = 'ar-SA') => {
    try {
        if (typeof time === 'string') {
            // Handle time string like "19:00:00"
            const [hours, minutes] = time.split(':');
            const timeObj = new Date();
            timeObj.setHours(parseInt(hours), parseInt(minutes));
            return new Intl.DateTimeFormat(locale, {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }).format(timeObj);
        }
        return new Intl.DateTimeFormat(locale, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).format(new Date(time));
    } catch (error) {
        console.error('Error formatting time:', error);
        return time.toString();
    }
};

const calculateProgress = (current, target) => {
    if (!target || target <= 0) {return 0;}
    const progress = (current / target) * 100;
    return Math.min(Math.round(progress * 100) / 100, 100); // Round to 2 decimal places, max 100%
};

const getDaysRemaining = (endDate) => {
    try {
        const end = new Date(endDate);
        const now = new Date();
        const diffTime = end.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
    } catch (error) {
        console.error('Error calculating days remaining:', error);
        return 0;
    }
};

const isValidDate = (date) => {
    return date instanceof Date && !isNaN(date);
};

module.exports = {
    generateHijriDate,
    formatSAR,
    formatDate,
    formatTime,
    calculateProgress,
    getDaysRemaining,
    isValidDate
};
