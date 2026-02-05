/**
 * SoloHabits - Achievement System
 * Handles achievement definitions, unlocking, and progress tracking
 */

const Achievements = {
    // Achievement definitions
    definitions: [
        {
            id: 'first_habit',
            name: 'First Steps',
            description: 'Complete your first habit',
            icon: '🎯',
            condition: (data) => data.stats.totalCompleted >= 1,
            progress: (data) => Math.min(1, data.stats.totalCompleted),
            target: 1
        },
        {
            id: 'streak_3',
            name: 'Getting Started',
            description: 'Achieve a 3-day streak',
            icon: '🌱',
            condition: (data) => data.habits.some(h => h.currentStreak >= 3 || h.bestStreak >= 3),
            progress: (data) => Math.max(...data.habits.map(h => Math.min(3, h.currentStreak || 0)), 0),
            target: 3
        },
        {
            id: 'streak_7',
            name: 'Week Warrior',
            description: 'Achieve a 7-day streak',
            icon: '🔥',
            condition: (data) => data.habits.some(h => h.currentStreak >= 7 || h.bestStreak >= 7),
            progress: (data) => Math.max(...data.habits.map(h => Math.min(7, h.currentStreak || 0)), 0),
            target: 7
        },
        {
            id: 'streak_30',
            name: 'Monthly Master',
            description: 'Achieve a 30-day streak',
            icon: '💎',
            condition: (data) => data.habits.some(h => h.currentStreak >= 30 || h.bestStreak >= 30),
            progress: (data) => Math.max(...data.habits.map(h => Math.min(30, h.currentStreak || 0)), 0),
            target: 30
        },
        {
            id: 'level_5',
            name: 'Rising Star',
            description: 'Reach Level 5',
            icon: '⭐',
            condition: (data) => data.stats.level >= 5,
            progress: (data) => Math.min(5, data.stats.level),
            target: 5
        },
        {
            id: 'level_10',
            name: 'Dedicated',
            description: 'Reach Level 10',
            icon: '🌟',
            condition: (data) => data.stats.level >= 10,
            progress: (data) => Math.min(10, data.stats.level),
            target: 10
        },
        {
            id: 'level_20',
            name: 'Habit Hero',
            description: 'Reach Level 20',
            icon: '👑',
            condition: (data) => data.stats.level >= 20,
            progress: (data) => Math.min(20, data.stats.level),
            target: 20
        },
        {
            id: 'habits_10',
            name: 'Task Tackler',
            description: 'Complete 10 habits',
            icon: '✅',
            condition: (data) => data.stats.totalCompleted >= 10,
            progress: (data) => Math.min(10, data.stats.totalCompleted),
            target: 10
        },
        {
            id: 'habits_50',
            name: 'Habit Hunter',
            description: 'Complete 50 habits',
            icon: '🏆',
            condition: (data) => data.stats.totalCompleted >= 50,
            progress: (data) => Math.min(50, data.stats.totalCompleted),
            target: 50
        },
        {
            id: 'habits_100',
            name: 'Century Club',
            description: 'Complete 100 habits',
            icon: '💯',
            condition: (data) => data.stats.totalCompleted >= 100,
            progress: (data) => Math.min(100, data.stats.totalCompleted),
            target: 100
        },
        {
            id: 'perfect_week',
            name: 'Perfect Week',
            description: 'Complete all habits for 7 days',
            icon: '🎖️',
            condition: (data) => data.stats.perfectWeeks >= 1,
            progress: (data) => Math.min(1, data.stats.perfectWeeks || 0),
            target: 1
        },
        {
            id: 'early_bird',
            name: 'Early Bird',
            description: 'Complete a habit before 8 AM',
            icon: '🌅',
            condition: (data) => data.achievements.includes('early_bird_unlocked'),
            progress: (data) => data.achievements.includes('early_bird_unlocked') ? 1 : 0,
            target: 1,
            special: 'early_bird'
        },
        {
            id: 'night_owl',
            name: 'Night Owl',
            description: 'Complete a habit after 10 PM',
            icon: '🌙',
            condition: (data) => data.achievements.includes('night_owl_unlocked'),
            progress: (data) => data.achievements.includes('night_owl_unlocked') ? 1 : 0,
            target: 1,
            special: 'night_owl'
        },
        {
            id: 'multi_habit',
            name: 'Multitasker',
            description: 'Track 5 habits at once',
            icon: '🎪',
            condition: (data) => data.habits.filter(h => h.enabled).length >= 5,
            progress: (data) => Math.min(5, data.habits.filter(h => h.enabled).length),
            target: 5
        },
        {
            id: 'comeback',
            name: 'Comeback Kid',
            description: 'Rebuild a streak after losing it',
            icon: '💪',
            condition: (data) => data.achievements.includes('comeback_unlocked'),
            progress: (data) => data.achievements.includes('comeback_unlocked') ? 1 : 0,
            target: 1,
            special: 'comeback'
        },
        {
            id: 'xp_500',
            name: 'XP Collector',
            description: 'Earn 500 XP total',
            icon: '⚡',
            condition: (data) => data.stats.totalXP >= 500,
            progress: (data) => Math.min(500, data.stats.totalXP),
            target: 500
        },
        {
            id: 'xp_1000',
            name: 'XP Master',
            description: 'Earn 1000 XP total',
            icon: '🔮',
            condition: (data) => data.stats.totalXP >= 1000,
            progress: (data) => Math.min(1000, data.stats.totalXP),
            target: 1000
        }
    ],

    // Check all achievements and return newly unlocked ones
    checkAll() {
        const data = Storage.load();
        if (!data) return [];

        const newlyUnlocked = [];
        const unlockedIds = data.achievements || [];

        this.definitions.forEach(achievement => {
            if (!unlockedIds.includes(achievement.id)) {
                try {
                    if (achievement.condition(data)) {
                        newlyUnlocked.push(achievement);
                    }
                } catch (e) {
                    // Condition check failed, skip
                }
            }
        });

        // Save newly unlocked achievements
        if (newlyUnlocked.length > 0) {
            Storage.update(d => {
                newlyUnlocked.forEach(a => {
                    if (!d.achievements.includes(a.id)) {
                        d.achievements.push(a.id);
                    }
                });
            });
        }

        return newlyUnlocked;
    },

    // Check for time-based achievements (early bird, night owl)
    checkTimeBasedAchievements() {
        const hour = new Date().getHours();
        const data = Storage.load();
        if (!data) return [];

        const newlyUnlocked = [];

        // Early Bird: Before 8 AM
        if (hour < 8 && !data.achievements.includes('early_bird_unlocked')) {
            Storage.update(d => {
                d.achievements.push('early_bird_unlocked');
            });
            const achievement = this.definitions.find(a => a.id === 'early_bird');
            if (achievement && !data.achievements.includes('early_bird')) {
                newlyUnlocked.push(achievement);
                Storage.update(d => d.achievements.push('early_bird'));
            }
        }

        // Night Owl: After 10 PM
        if (hour >= 22 && !data.achievements.includes('night_owl_unlocked')) {
            Storage.update(d => {
                d.achievements.push('night_owl_unlocked');
            });
            const achievement = this.definitions.find(a => a.id === 'night_owl');
            if (achievement && !data.achievements.includes('night_owl')) {
                newlyUnlocked.push(achievement);
                Storage.update(d => d.achievements.push('night_owl'));
            }
        }

        return newlyUnlocked;
    },

    // Check comeback achievement (streak lost and rebuilt)
    checkComebackAchievement(habitId) {
        const data = Storage.load();
        if (!data || data.achievements.includes('comeback_unlocked')) return null;

        const habit = data.habits.find(h => h.id === habitId);
        if (!habit) return null;

        // If habit had a best streak > 3 but current streak was 0 and now is >= 3
        if (habit.bestStreak >= 3 && habit.currentStreak >= 3) {
            Storage.update(d => {
                d.achievements.push('comeback_unlocked');
                if (!d.achievements.includes('comeback')) {
                    d.achievements.push('comeback');
                }
            });
            return this.definitions.find(a => a.id === 'comeback');
        }

        return null;
    },

    // Get achievement by ID
    get(id) {
        return this.definitions.find(a => a.id === id);
    },

    // Get all achievements with their status
    getAll() {
        const data = Storage.load();
        const unlockedIds = data?.achievements || [];

        return this.definitions.map(achievement => {
            const isUnlocked = unlockedIds.includes(achievement.id);
            let progress = 0;
            try {
                progress = data ? achievement.progress(data) : 0;
            } catch (e) {
                progress = 0;
            }

            return {
                ...achievement,
                unlocked: isUnlocked,
                progress,
                progressPercent: Math.round((progress / achievement.target) * 100)
            };
        });
    },

    // Get unlocked count
    getUnlockedCount() {
        const data = Storage.load();
        if (!data || !data.achievements) return 0;
        
        // Count only main achievements (not special markers)
        return data.achievements.filter(id => 
            this.definitions.some(d => d.id === id)
        ).length;
    },

    // Get total achievements count
    getTotalCount() {
        return this.definitions.length;
    },

    // Award XP for achievement unlock
    awardAchievementXP() {
        return XP.addXP(XP.REWARDS.ACHIEVEMENT);
    },

    // Render achievements in the UI
    renderAll() {
        const container = document.getElementById('achievementsList');
        if (!container) return;

        const achievements = this.getAll();
        const unlockedCount = this.getUnlockedCount();
        
        // Update counts
        document.getElementById('unlockedCount').textContent = unlockedCount;
        document.getElementById('totalAchievements').textContent = this.getTotalCount();
        document.getElementById('achievementCount').textContent = unlockedCount;

        container.innerHTML = achievements.map(a => `
            <div class="achievement-card ${a.unlocked ? 'unlocked' : 'locked'}">
                <div class="achievement-badge">${a.icon}</div>
                <div class="achievement-name">${a.name}</div>
                <div class="achievement-desc">${a.description}</div>
                ${!a.unlocked ? `
                    <div class="achievement-progress">
                        <div class="achievement-progress-bar" style="width: ${a.progressPercent}%"></div>
                    </div>
                ` : ''}
            </div>
        `).join('');
    }
};
