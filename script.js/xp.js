/**
 * SoloHabits - XP & Level System
 * Handles XP rewards, level calculations, and level-up notifications
 */

const XP = {
    // XP reward values
    REWARDS: {
        HABIT_COMPLETE: 10,      // Base XP for completing a habit
        STREAK_BONUS_3: 5,       // Bonus for 3+ day streak
        STREAK_BONUS_7: 10,      // Bonus for 7+ day streak
        STREAK_BONUS_30: 20,     // Bonus for 30+ day streak
        PERFECT_WEEK: 30,        // Bonus for completing all habits for a week
        ACHIEVEMENT: 25          // Bonus for unlocking achievement
    },

    // XP required per level
    XP_PER_LEVEL: 100,

    // Calculate level from total XP
    calculateLevel(totalXP) {
        return Math.floor(totalXP / this.XP_PER_LEVEL) + 1;
    },

    // Calculate XP progress within current level
    calculateProgress(totalXP) {
        const xpInCurrentLevel = totalXP % this.XP_PER_LEVEL;
        return Math.round((xpInCurrentLevel / this.XP_PER_LEVEL) * 100);
    },

    // Get XP needed for next level
    getXPForNextLevel(totalXP) {
        const currentLevelXP = totalXP % this.XP_PER_LEVEL;
        return this.XP_PER_LEVEL - currentLevelXP;
    },

    // Get total XP needed to reach a specific level
    getTotalXPForLevel(level) {
        return (level - 1) * this.XP_PER_LEVEL;
    },

    // Award XP for completing a habit
    awardHabitCompletion(habit) {
        let xp = this.REWARDS.HABIT_COMPLETE;
        let bonuses = [];

        // Streak bonuses
        const streak = habit.currentStreak || 0;
        if (streak >= 30) {
            xp += this.REWARDS.STREAK_BONUS_30;
            bonuses.push({ type: '30-day streak', amount: this.REWARDS.STREAK_BONUS_30 });
        } else if (streak >= 7) {
            xp += this.REWARDS.STREAK_BONUS_7;
            bonuses.push({ type: '7-day streak', amount: this.REWARDS.STREAK_BONUS_7 });
        } else if (streak >= 3) {
            xp += this.REWARDS.STREAK_BONUS_3;
            bonuses.push({ type: '3-day streak', amount: this.REWARDS.STREAK_BONUS_3 });
        }

        return { xp, bonuses };
    },

    // Add XP and check for level up
    addXP(amount) {
        return Storage.update(data => {
            const oldLevel = this.calculateLevel(data.stats.totalXP);
            data.stats.totalXP += amount;
            const newLevel = this.calculateLevel(data.stats.totalXP);
            data.stats.level = newLevel;

            // Return level up info if leveled up
            if (newLevel > oldLevel) {
                return { leveledUp: true, newLevel, totalXP: data.stats.totalXP };
            }
            return { leveledUp: false, newLevel, totalXP: data.stats.totalXP };
        });
    },

    // Check and award perfect week bonus
    checkPerfectWeek() {
        const data = Storage.load();
        if (!data || !data.habits || data.habits.length === 0) return false;

        const weekDays = Utils.getWeekDays();
        const today = Utils.getToday();
        const todayIndex = weekDays.findIndex(d => d.date === today);
        
        // Only check on Sunday (end of week) or if we're mid-week
        if (todayIndex < 6) return false;

        // Check if all active habits were completed every day this week
        const activeHabits = data.habits.filter(h => h.enabled);
        if (activeHabits.length === 0) return false;

        let isPerfect = true;
        for (const day of weekDays) {
            for (const habit of activeHabits) {
                // Check if habit should be active on this day
                if (Utils.isHabitActiveToday({ ...habit, frequency: habit.frequency, days: habit.days })) {
                    if (!habit.completedDates.includes(day.date)) {
                        isPerfect = false;
                        break;
                    }
                }
            }
            if (!isPerfect) break;
        }

        if (isPerfect) {
            const weekKey = Utils.getWeekStart();
            if (!data.weeklyData[weekKey]?.perfectWeekAwarded) {
                Storage.update(d => {
                    if (!d.weeklyData[weekKey]) d.weeklyData[weekKey] = {};
                    d.weeklyData[weekKey].perfectWeekAwarded = true;
                    d.stats.perfectWeeks = (d.stats.perfectWeeks || 0) + 1;
                });
                this.addXP(this.REWARDS.PERFECT_WEEK);
                return true;
            }
        }

        return false;
    },

    // Get current XP info
    getXPInfo() {
        const data = Storage.load();
        if (!data) return { totalXP: 0, level: 1, progress: 0, xpToNext: 100 };

        const totalXP = data.stats.totalXP || 0;
        return {
            totalXP,
            level: this.calculateLevel(totalXP),
            progress: this.calculateProgress(totalXP),
            xpToNext: this.getXPForNextLevel(totalXP),
            xpInLevel: totalXP % this.XP_PER_LEVEL,
            nextLevelTotal: this.XP_PER_LEVEL
        };
    },

    // Update UI elements with XP info
    updateUI() {
        const info = this.getXPInfo();
        
        // Home view XP bar
        const currentLevel = document.getElementById('currentLevel');
        const currentXP = document.getElementById('currentXP');
        const nextLevelXP = document.getElementById('nextLevelXP');
        const xpProgress = document.getElementById('xpProgress');
        
        if (currentLevel) currentLevel.textContent = info.level;
        if (currentXP) currentXP.textContent = info.xpInLevel;
        if (nextLevelXP) nextLevelXP.textContent = info.nextLevelTotal;
        if (xpProgress) xpProgress.style.width = `${info.progress}%`;

        // Header level badge
        const headerLevel = document.querySelector('#headerLevel .level-num');
        if (headerLevel) headerLevel.textContent = info.level;

        // Profile view
        const profileLevelNum = document.getElementById('profileLevelNum');
        const profileXpProgress = document.getElementById('profileXpProgress');
        const profileCurrentXP = document.getElementById('profileCurrentXP');
        const profileNextXP = document.getElementById('profileNextXP');
        const totalXPElement = document.getElementById('totalXP');

        if (profileLevelNum) profileLevelNum.textContent = info.level;
        if (profileXpProgress) profileXpProgress.style.width = `${info.progress}%`;
        if (profileCurrentXP) profileCurrentXP.textContent = info.xpInLevel;
        if (profileNextXP) profileNextXP.textContent = info.nextLevelTotal;
        if (totalXPElement) totalXPElement.textContent = info.totalXP;
    }
};
