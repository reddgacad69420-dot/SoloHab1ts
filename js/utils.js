/**
 * SoloHabits - Utility Functions
 * Helper functions for dates, IDs, and common operations
 */

const Utils = {
    // Generate unique ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // Get today's date as YYYY-MM-DD
    getToday() {
        return new Date().toISOString().split('T')[0];
    },

    // Get day of week (0 = Sunday, 6 = Saturday)
    getDayOfWeek() {
        return new Date().getDay();
    },

    // Get week number of the year
    getWeekNumber() {
        const date = new Date();
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    },

    // Get start of current week (Sunday)
    getWeekStart() {
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day;
        return new Date(now.setDate(diff)).toISOString().split('T')[0];
    },

    // Format date for display
    formatDate(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    },

    // Format time for display
    formatTime(timeStr) {
        if (!timeStr) return '';
        const [hours, minutes] = timeStr.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    },

    // Check if date is today
    isToday(dateStr) {
        return dateStr === this.getToday();
    },

    // Check if date is yesterday
    isYesterday(dateStr) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return dateStr === yesterday.toISOString().split('T')[0];
    },

    // Get days since a date
    getDaysSince(dateStr) {
        if (!dateStr) return Infinity;
        const then = new Date(dateStr);
        const now = new Date();
        const diffTime = Math.abs(now - then);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    },

    // Get date N days ago
    getDaysAgo(n) {
        const date = new Date();
        date.setDate(date.getDate() - n);
        return date.toISOString().split('T')[0];
    },

    // Check if habit should be active today based on frequency
    isHabitActiveToday(habit) {
        if (!habit.enabled) return false;
        
        const today = this.getDayOfWeek();
        
        switch (habit.frequency) {
            case 'daily':
                return true;
            case 'weekly':
                // Default to first selected day or Monday
                return habit.days.includes(today) || (habit.days.length === 0 && today === 1);
            case 'custom':
                return habit.days.includes(today);
            default:
                return true;
        }
    },

    // Check if habit was completed today
    isCompletedToday(habit) {
        return habit.completedDates && habit.completedDates.includes(this.getToday());
    },

    // Perform daily reset check
    checkDailyReset(lastResetDate) {
        const today = this.getToday();
        return lastResetDate !== today;
    },

    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Throttle function
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // Haptic feedback
    vibrate(pattern = 10) {
        if (navigator.vibrate) {
            navigator.vibrate(pattern);
        }
    },

    // Deep clone object
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    // Safely parse JSON
    safeJsonParse(str, fallback = null) {
        try {
            return JSON.parse(str);
        } catch (e) {
            return fallback;
        }
    },

    // Calculate completion percentage
    calculateCompletionRate(habit) {
        if (!habit.completedDates || habit.completedDates.length === 0) return 0;
        
        const startDate = habit.createdAt ? new Date(habit.createdAt) : new Date();
        const now = new Date();
        const totalDays = Math.max(1, Math.ceil((now - startDate) / (1000 * 60 * 60 * 24)));
        
        // Adjust for frequency
        let expectedDays = totalDays;
        if (habit.frequency === 'weekly') {
            expectedDays = Math.ceil(totalDays / 7);
        } else if (habit.frequency === 'custom' && habit.days.length > 0) {
            expectedDays = Math.ceil(totalDays * (habit.days.length / 7));
        }
        
        return Math.min(100, Math.round((habit.completedDates.length / expectedDays) * 100));
    },

    // Get days for current week
    getWeekDays() {
        const days = [];
        const today = new Date();
        const dayOfWeek = today.getDay();
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - dayOfWeek + i);
            days.push({
                date: date.toISOString().split('T')[0],
                label: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][i],
                isToday: i === dayOfWeek
            });
        }
        return days;
    },

    // Icon options for habits
    habitIcons: [
        '💪', '🏃', '📚', '🧘', '💧', '🥗', '😴', '📝',
        '🎯', '💰', '🧹', '🌱', '🎨', '🎵', '💻', '📱',
        '🚴', '🏋️', '⏰', '☀️', '🌙', '💊', '🧠', '❤️',
        '🏠', '👨‍👩‍👧', '📞', '🚿', '🦷', '👔', '🎓', '✈️'
    ],

    // Avatar options
    avatarOptions: [
        '😊', '😎', '🤓', '😇', '🥳', '🤗', '😺', '🐶',
        '🦊', '🐼', '🦁', '🐯', '🦄', '🐲', '👨', '👩',
        '👦', '👧', '🧑', '🦸', '🧙', '🥷', '👻', '🤖'
    ],

    // Motivational messages
    motivationalMessages: [
        "Great job! Keep it up! 🎉",
        "You're on fire! 🔥",
        "Building great habits! 💪",
        "One step at a time! 👣",
        "Consistency is key! 🔑",
        "You've got this! 💫",
        "Progress, not perfection! ⭐",
        "Keep pushing forward! 🚀"
    ],

    // Get random motivational message
    getMotivationalMessage() {
        return this.motivationalMessages[Math.floor(Math.random() * this.motivationalMessages.length)];
    }
};
