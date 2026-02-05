/**
 * SoloHabits - Streak System
 * Handles streak tracking, updates, and streak-related calculations
 */

const Streaks = {
    // Update streak when habit is completed
    incrementStreak(habitId) {
        Storage.update(data => {
            const habit = data.habits.find(h => h.id === habitId);
            if (!habit) return;

            const today = Utils.getToday();
            const yesterday = Utils.getDaysAgo(1);
            const lastCompleted = habit.lastCompleted;

            // Check if this is a continuation of the streak
            if (lastCompleted === yesterday || lastCompleted === today) {
                // Continue streak (don't double count today)
                if (lastCompleted !== today) {
                    habit.currentStreak = (habit.currentStreak || 0) + 1;
                }
            } else if (!lastCompleted || Utils.getDaysSince(lastCompleted) > 1) {
                // Streak broken or new habit, start fresh
                habit.currentStreak = 1;
            }

            // Update best streak
            if (habit.currentStreak > (habit.bestStreak || 0)) {
                habit.bestStreak = habit.currentStreak;
            }

            habit.lastCompleted = today;
        });
    },

    // Check and reset broken streaks (called on daily reset)
    checkBrokenStreaks() {
        const today = Utils.getToday();
        const yesterday = Utils.getDaysAgo(1);

        Storage.update(data => {
            data.habits.forEach(habit => {
                if (!habit.enabled) return;

                const lastCompleted = habit.lastCompleted;
                
                // If habit wasn't completed yesterday and was active, reset streak
                if (lastCompleted && lastCompleted !== yesterday && lastCompleted !== today) {
                    // Check if habit should have been done yesterday
                    const wasActiveYesterday = this.wasHabitActiveOnDate(habit, yesterday);
                    if (wasActiveYesterday) {
                        habit.currentStreak = 0;
                    }
                }
            });
        });
    },

    // Check if habit was active on a specific date
    wasHabitActiveOnDate(habit, dateStr) {
        const date = new Date(dateStr);
        const dayOfWeek = date.getDay();

        switch (habit.frequency) {
            case 'daily':
                return true;
            case 'weekly':
                return habit.days.includes(dayOfWeek) || (habit.days.length === 0 && dayOfWeek === 1);
            case 'custom':
                return habit.days.includes(dayOfWeek);
            default:
                return true;
        }
    },

    // Reset streak for a habit (when undoing completion and breaking streak)
    resetStreak(habitId) {
        Storage.update(data => {
            const habit = data.habits.find(h => h.id === habitId);
            if (!habit) return;

            const today = Utils.getToday();
            const yesterday = Utils.getDaysAgo(1);

            // Only reset if the last completion was today
            if (habit.lastCompleted === today) {
                // Check if there was a completion yesterday to restore streak
                if (habit.completedDates.includes(yesterday)) {
                    // Don't reset, just adjust
                    habit.currentStreak = Math.max(0, (habit.currentStreak || 1) - 1);
                } else {
                    habit.currentStreak = 0;
                }
            }
        });
    },

    // Get streak info for a habit
    getStreakInfo(habitId) {
        const data = Storage.load();
        if (!data) return { current: 0, best: 0 };

        const habit = data.habits.find(h => h.id === habitId);
        if (!habit) return { current: 0, best: 0 };

        return {
            current: habit.currentStreak || 0,
            best: habit.bestStreak || 0,
            lastCompleted: habit.lastCompleted
        };
    },

    // Get best streak across all habits
    getBestOverallStreak() {
        const data = Storage.load();
        if (!data || !data.habits) return 0;

        return data.habits.reduce((best, habit) => {
            return Math.max(best, habit.bestStreak || 0);
        }, 0);
    },

    // Get current best streak across all habits
    getCurrentBestStreak() {
        const data = Storage.load();
        if (!data || !data.habits) return 0;

        return data.habits.reduce((best, habit) => {
            return Math.max(best, habit.currentStreak || 0);
        }, 0);
    },

    // Get habits sorted by streak (for leaderboard)
    getStreakLeaderboard() {
        const data = Storage.load();
        if (!data || !data.habits) return [];

        return data.habits
            .filter(h => h.enabled)
            .map(habit => ({
                id: habit.id,
                name: habit.name,
                icon: habit.icon,
                currentStreak: habit.currentStreak || 0,
                bestStreak: habit.bestStreak || 0
            }))
            .sort((a, b) => b.currentStreak - a.currentStreak);
    },

    // Calculate total streak days (sum of all current streaks)
    getTotalStreakDays() {
        const data = Storage.load();
        if (!data || !data.habits) return 0;

        return data.habits.reduce((total, habit) => {
            return total + (habit.currentStreak || 0);
        }, 0);
    },

    // Check if any habit has a milestone streak
    checkStreakMilestones() {
        const milestones = [3, 7, 14, 21, 30, 60, 90, 100, 365];
        const data = Storage.load();
        if (!data || !data.habits) return [];

        const reached = [];
        data.habits.forEach(habit => {
            const streak = habit.currentStreak || 0;
            milestones.forEach(milestone => {
                if (streak === milestone) {
                    reached.push({
                        habitId: habit.id,
                        habitName: habit.name,
                        milestone
                    });
                }
            });
        });

        return reached;
    },

    // Get streak status for display
    getStreakStatus(currentStreak) {
        if (currentStreak >= 30) return { emoji: '🔥', label: 'On Fire!', class: 'streak-fire' };
        if (currentStreak >= 7) return { emoji: '⚡', label: 'Hot Streak!', class: 'streak-hot' };
        if (currentStreak >= 3) return { emoji: '✨', label: 'Building!', class: 'streak-building' };
        if (currentStreak > 0) return { emoji: '🌱', label: 'Growing', class: 'streak-growing' };
        return { emoji: '', label: '', class: '' };
    }
};
