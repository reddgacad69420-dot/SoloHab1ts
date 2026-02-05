/**
 * SoloHabits - Habit Management
 * Handles CRUD operations, completion tracking, and habit filtering
 */

const Habits = {
    currentFilter: 'all',

    // Get all habits
    getAll() {
        const data = Storage.load();
        return data?.habits || [];
    },

    // Get habit by ID
    get(id) {
        const habits = this.getAll();
        return habits.find(h => h.id === id);
    },

    // Get habits for today (filtered by frequency and active status)
    getTodayHabits() {
        const habits = this.getAll();
        return habits
            .filter(h => Utils.isHabitActiveToday(h))
            .sort((a, b) => (a.order || 0) - (b.order || 0));
    },

    // Get habits by filter
    getFiltered(filter = 'all') {
        const todayHabits = this.getTodayHabits();
        
        switch (filter) {
            case 'daily':
                return todayHabits.filter(h => h.frequency === 'daily');
            case 'weekly':
                return todayHabits.filter(h => h.frequency === 'weekly' || h.frequency === 'custom');
            default:
                return todayHabits;
        }
    },

    // Add new habit
    add(habitData) {
        const data = Storage.load();
        const maxOrder = data.habits.length > 0 
            ? Math.max(...data.habits.map(h => h.order || 0)) 
            : -1;

        const newHabit = {
            id: Utils.generateId(),
            name: habitData.name.trim(),
            description: habitData.description?.trim() || '',
            icon: habitData.icon || '✨',
            color: habitData.color || '#6366f1',
            frequency: habitData.frequency || 'daily',
            days: habitData.days || [],
            enabled: true,
            currentStreak: 0,
            bestStreak: 0,
            lastCompleted: null,
            completedDates: [],
            createdAt: Utils.getToday(),
            reminderEnabled: habitData.reminderEnabled || false,
            reminderTime: habitData.reminderTime || '09:00',
            order: maxOrder + 1
        };

        Storage.update(d => {
            d.habits.push(newHabit);
        });

        // Check multi-habit achievement
        Achievements.checkAll();

        return newHabit;
    },

    // Update existing habit
    update(id, updates) {
        Storage.update(data => {
            const index = data.habits.findIndex(h => h.id === id);
            if (index !== -1) {
                data.habits[index] = {
                    ...data.habits[index],
                    ...updates,
                    name: updates.name?.trim() || data.habits[index].name,
                    description: updates.description?.trim() ?? data.habits[index].description
                };
            }
        });
    },

    // Delete habit
    delete(id) {
        Storage.update(data => {
            data.habits = data.habits.filter(h => h.id !== id);
        });
    },

    // Toggle habit enabled status
    toggleEnabled(id) {
        const habit = this.get(id);
        if (habit) {
            this.update(id, { enabled: !habit.enabled });
        }
    },

    // Complete a habit
    complete(id) {
        const habit = this.get(id);
        if (!habit) return null;

        const today = Utils.getToday();
        
        // Check if already completed today
        if (habit.completedDates.includes(today)) {
            return { alreadyCompleted: true };
        }

        // Update habit completion
        Storage.update(data => {
            const h = data.habits.find(hab => hab.id === id);
            if (h) {
                h.completedDates.push(today);
                h.lastCompleted = today;
            }
            data.stats.totalCompleted = (data.stats.totalCompleted || 0) + 1;
        });

        // Update streak
        Streaks.incrementStreak(id);

        // Get updated habit for XP calculation
        const updatedHabit = this.get(id);

        // Award XP
        const xpReward = XP.awardHabitCompletion(updatedHabit);
        const xpResult = XP.addXP(xpReward.xp);

        // Check time-based achievements
        const timeAchievements = Achievements.checkTimeBasedAchievements();

        // Check comeback achievement
        const comebackAchievement = Achievements.checkComebackAchievement(id);

        // Check all achievements
        const newAchievements = Achievements.checkAll();
        
        // Combine all new achievements
        const allNewAchievements = [
            ...timeAchievements,
            ...(comebackAchievement ? [comebackAchievement] : []),
            ...newAchievements
        ];

        // Award XP for achievements
        allNewAchievements.forEach(() => {
            Achievements.awardAchievementXP();
        });

        // Haptic feedback
        Utils.vibrate(15);

        return {
            xp: xpReward.xp,
            bonuses: xpReward.bonuses,
            leveledUp: xpResult?.leveledUp,
            newLevel: xpResult?.newLevel,
            achievements: allNewAchievements,
            streak: updatedHabit.currentStreak
        };
    },

    // Undo habit completion
    uncomplete(id) {
        const habit = this.get(id);
        if (!habit) return false;

        const today = Utils.getToday();
        
        // Check if completed today
        if (!habit.completedDates.includes(today)) {
            return false;
        }

        // Get habit info for XP calculation before removing
        const habitStreak = habit.currentStreak || 0;
        let xpToRemove = XP.REWARDS.HABIT_COMPLETE;
        
        // Add streak bonuses that were awarded
        if (habitStreak >= 30) {
            xpToRemove += XP.REWARDS.STREAK_BONUS_30;
        } else if (habitStreak >= 7) {
            xpToRemove += XP.REWARDS.STREAK_BONUS_7;
        } else if (habitStreak >= 3) {
            xpToRemove += XP.REWARDS.STREAK_BONUS_3;
        }

        // Remove today's completion and deduct XP
        Storage.update(data => {
            const h = data.habits.find(hab => hab.id === id);
            if (h) {
                h.completedDates = h.completedDates.filter(d => d !== today);
                // Update lastCompleted to most recent completion
                h.lastCompleted = h.completedDates.length > 0 
                    ? h.completedDates[h.completedDates.length - 1] 
                    : null;
            }
            data.stats.totalCompleted = Math.max(0, (data.stats.totalCompleted || 1) - 1);
            // Deduct XP (but don't go below 0)
            data.stats.totalXP = Math.max(0, (data.stats.totalXP || 0) - xpToRemove);
            data.stats.level = XP.calculateLevel(data.stats.totalXP);
        });

        // Reset streak if needed
        Streaks.resetStreak(id);

        return true;
    },

    // Check if habit is completed today
    isCompletedToday(id) {
        const habit = this.get(id);
        return habit ? Utils.isCompletedToday(habit) : false;
    },

    // Get completion stats for today
    getTodayStats() {
        const todayHabits = this.getTodayHabits();
        const completed = todayHabits.filter(h => Utils.isCompletedToday(h)).length;
        const total = todayHabits.length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        return { completed, total, percentage };
    },

    // Reorder habits
    reorder(fromIndex, toIndex) {
        Storage.update(data => {
            const habits = data.habits;
            const [moved] = habits.splice(fromIndex, 1);
            habits.splice(toIndex, 0, moved);
            
            // Update order property
            habits.forEach((h, i) => {
                h.order = i;
            });
        });
    },

    // Save habit from form
    saveHabit(event) {
        event.preventDefault();
        
        const form = document.getElementById('habitForm');
        const id = document.getElementById('habitId').value;
        
        const habitData = {
            name: document.getElementById('habitName').value,
            description: document.getElementById('habitDescription').value,
            icon: document.getElementById('selectedIcon').textContent,
            color: document.querySelector('.color-option.selected')?.dataset.color || '#6366f1',
            frequency: document.querySelector('.freq-btn.active')?.dataset.freq || 'daily',
            days: Array.from(document.querySelectorAll('.day-btn.active')).map(b => parseInt(b.dataset.day)),
            reminderEnabled: document.getElementById('habitReminderToggle').checked,
            reminderTime: document.getElementById('habitReminderTime').value
        };

        if (id) {
            // Update existing
            this.update(id, habitData);
            UI.showToast('Habit updated!', 'success');
        } else {
            // Add new
            this.add(habitData);
            UI.showToast('Habit added!', 'success');
        }

        // Schedule notification if enabled
        if (habitData.reminderEnabled) {
            const habit = id ? this.get(id) : this.getAll().slice(-1)[0];
            Notifications.scheduleHabitReminder(habit);
        }

        UI.closeModal('habitModal');
        UI.renderHabits();
        form.reset();
    },

    // Render habits list
    render() {
        const container = document.getElementById('habitsList');
        const emptyState = document.getElementById('emptyHabits');
        
        if (!container) return;

        const habits = this.getFiltered(this.currentFilter);

        if (habits.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';

        container.innerHTML = habits.map(habit => {
            const isCompleted = Utils.isCompletedToday(habit);
            const streak = habit.currentStreak || 0;
            const streakStatus = Streaks.getStreakStatus(streak);

            return `
                <div class="habit-card ${isCompleted ? 'completed' : ''} ${!habit.enabled ? 'disabled' : ''}" 
                     data-id="${habit.id}" 
                     style="border-left-color: ${habit.color}">
                    <button class="habit-check" onclick="Habits.toggleComplete('${habit.id}')" 
                            aria-label="${isCompleted ? 'Undo completion' : 'Mark complete'}">
                        ${isCompleted ? '✓' : ''}
                    </button>
                    <span class="habit-icon">${habit.icon}</span>
                    <div class="habit-info">
                        <div class="habit-name">
                            <span>${this.escapeHtml(habit.name)}</span>
                        </div>
                        <div class="habit-meta">
                            <span>${habit.frequency}</span>
                            ${streak > 0 ? `<span class="streak-badge">${streakStatus.emoji} ${streak} day${streak > 1 ? 's' : ''}</span>` : ''}
                        </div>
                    </div>
                    <div class="habit-actions">
                        <button class="habit-action-btn" onclick="UI.showEditHabitModal('${habit.id}')" aria-label="Edit">
                            ✏️
                        </button>
                        <button class="habit-action-btn" onclick="Habits.confirmDelete('${habit.id}')" aria-label="Delete">
                            🗑️
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    },

    // Toggle completion (complete or uncomplete)
    toggleComplete(id) {
        const isCompleted = this.isCompletedToday(id);
        
        if (isCompleted) {
            this.uncomplete(id);
            UI.showToast('Habit undone', 'warning');
        } else {
            const result = this.complete(id);
            if (result && !result.alreadyCompleted) {
                // Show XP toast
                let message = `+${result.xp} XP`;
                if (result.bonuses && result.bonuses.length > 0) {
                    message += ' (with streak bonus!)';
                }
                UI.showToast(message, 'success');

                // Show level up if applicable
                if (result.leveledUp) {
                    setTimeout(() => {
                        UI.showLevelUp(result.newLevel);
                    }, 500);
                }

                // Show achievements
                if (result.achievements && result.achievements.length > 0) {
                    setTimeout(() => {
                        result.achievements.forEach((a, i) => {
                            setTimeout(() => UI.showAchievementUnlock(a), i * 1500);
                        });
                    }, result.leveledUp ? 2000 : 500);
                }
            }
        }

        // Update UI
        this.render();
        XP.updateUI();
        UI.renderHomeWeekCalendar();
        Achievements.renderAll();
    },

    // Confirm delete
    confirmDelete(id) {
        const habit = this.get(id);
        if (!habit) return;

        UI.showConfirm(
            'Delete Habit',
            `Are you sure you want to delete "${habit.name}"? This cannot be undone.`,
            (confirmed) => {
                if (confirmed) {
                    this.delete(id);
                    UI.showToast('Habit deleted', 'warning');
                    this.render();
                }
            }
        );
    },

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Set filter and re-render
    setFilter(filter) {
        this.currentFilter = filter;
        
        // Update filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        
        this.render();
    }
};
