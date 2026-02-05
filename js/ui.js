/**
 * SoloHabits - UI Module
 * Handles all DOM manipulation, modals, toasts, and view rendering
 */

const UI = {
    currentView: 'homeView',
    confirmCallback: null,

    // Initialize UI
    init() {
        this.setupNavigation();
        this.setupModalHandlers();
        this.setupFilterButtons();
        this.setupFormHandlers();
        this.renderIconPicker();
        this.renderAvatarPicker();
    },

    // Setup bottom navigation
    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const viewId = item.dataset.view;
                this.switchView(viewId);
                
                // Update active state
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            });
        });
    },

    // Switch between views
    switchView(viewId) {
        const views = document.querySelectorAll('.view');
        views.forEach(view => {
            view.classList.remove('active');
        });
        
        const targetView = document.getElementById(viewId);
        if (targetView) {
            targetView.classList.add('active');
            this.currentView = viewId;
            
            // Refresh view-specific content
            this.refreshViewContent(viewId);
        }
    },

    // Refresh content when switching views
    refreshViewContent(viewId) {
        switch (viewId) {
            case 'homeView':
                this.renderHomeWeekCalendar();
                Habits.render();
                XP.updateUI();
                break;
            case 'profileView':
                this.renderProfile();
                break;
            case 'achievementsView':
                Achievements.renderAll();
                break;
            case 'statsView':
                this.renderStats();
                break;
            case 'settingsView':
                Settings.loadSettingsUI();
                break;
        }
    },

    // Setup modal handlers
    setupModalHandlers() {
        // Close modals on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });

        // Habit reminder toggle
        const reminderToggle = document.getElementById('habitReminderToggle');
        const reminderTime = document.getElementById('habitReminderTime');
        if (reminderToggle && reminderTime) {
            reminderToggle.addEventListener('change', () => {
                reminderTime.disabled = !reminderToggle.checked;
            });
        }
    },

    // Setup filter buttons
    setupFilterButtons() {
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const filter = btn.dataset.filter;
                Habits.setFilter(filter);
            });
        });
    },

    // Setup form handlers
    setupFormHandlers() {
        // Frequency buttons
        const freqBtns = document.querySelectorAll('.freq-btn');
        freqBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                freqBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const customDays = document.getElementById('customDaysGroup');
                if (btn.dataset.freq === 'custom') {
                    customDays.style.display = 'block';
                } else {
                    customDays.style.display = 'none';
                }
            });
        });

        // Day buttons
        const dayBtns = document.querySelectorAll('.day-btn');
        dayBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                btn.classList.toggle('active');
            });
        });

        // Color options
        const colorOptions = document.querySelectorAll('.color-option');
        colorOptions.forEach(option => {
            option.addEventListener('click', () => {
                colorOptions.forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
            });
        });

        // Add habit button
        const addHabitBtn = document.getElementById('addHabitBtn');
        if (addHabitBtn) {
            addHabitBtn.addEventListener('click', () => this.showAddHabitModal());
        }
    },

    // Render icon picker
    renderIconPicker() {
        const iconGrid = document.querySelector('#iconDropdown .icon-grid');
        if (!iconGrid) return;

        iconGrid.innerHTML = Utils.habitIcons.map(icon => `
            <button type="button" class="icon-option" onclick="UI.selectIcon('${icon}')">${icon}</button>
        `).join('');
    },

    // Toggle icon picker dropdown
    toggleIconPicker() {
        const dropdown = document.getElementById('iconDropdown');
        dropdown.classList.toggle('active');
    },

    // Select icon
    selectIcon(icon) {
        document.getElementById('selectedIcon').textContent = icon;
        document.getElementById('iconDropdown').classList.remove('active');
    },

    // Render avatar picker
    renderAvatarPicker() {
        const avatarGrid = document.getElementById('avatarGrid');
        if (!avatarGrid) return;

        const data = Storage.load();
        const currentAvatar = data?.profile?.avatar || '😊';

        avatarGrid.innerHTML = Utils.avatarOptions.map(avatar => `
            <button class="avatar-option ${avatar === currentAvatar ? 'selected' : ''}" 
                    onclick="UI.selectAvatar('${avatar}')">${avatar}</button>
        `).join('');
    },

    // Show avatar picker modal
    showAvatarPicker() {
        this.renderAvatarPicker();
        this.openModal('avatarModal');
    },

    // Select avatar
    selectAvatar(avatar) {
        Storage.update(data => {
            data.profile.avatar = avatar;
        });
        document.getElementById('profileAvatar').textContent = avatar;
        this.closeModal('avatarModal');
        this.showToast('Avatar updated!', 'success');
    },

    // Edit username
    editUsername() {
        const data = Storage.load();
        const currentName = data?.profile?.username || 'User';
        
        const newName = prompt('Enter your name:', currentName);
        if (newName && newName.trim()) {
            Storage.update(d => {
                d.profile.username = newName.trim();
            });
            document.getElementById('profileName').textContent = newName.trim();
            this.showToast('Name updated!', 'success');
        }
    },

    // Show add habit modal
    showAddHabitModal() {
        this.resetHabitForm();
        document.getElementById('habitModalTitle').textContent = 'Add New Habit';
        document.getElementById('habitId').value = '';
        this.openModal('habitModal');
    },

    // Show edit habit modal
    showEditHabitModal(habitId) {
        const habit = Habits.get(habitId);
        if (!habit) return;

        this.resetHabitForm();
        
        document.getElementById('habitModalTitle').textContent = 'Edit Habit';
        document.getElementById('habitId').value = habit.id;
        document.getElementById('habitName').value = habit.name;
        document.getElementById('habitDescription').value = habit.description || '';
        document.getElementById('selectedIcon').textContent = habit.icon;
        
        // Set color
        document.querySelectorAll('.color-option').forEach(opt => {
            opt.classList.toggle('selected', opt.dataset.color === habit.color);
        });

        // Set frequency
        document.querySelectorAll('.freq-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.freq === habit.frequency);
        });

        // Show custom days if needed
        const customDays = document.getElementById('customDaysGroup');
        if (habit.frequency === 'custom') {
            customDays.style.display = 'block';
            document.querySelectorAll('.day-btn').forEach(btn => {
                btn.classList.toggle('active', habit.days.includes(parseInt(btn.dataset.day)));
            });
        } else {
            customDays.style.display = 'none';
        }

        // Set reminder
        document.getElementById('habitReminderToggle').checked = habit.reminderEnabled;
        document.getElementById('habitReminderTime').value = habit.reminderTime || '09:00';
        document.getElementById('habitReminderTime').disabled = !habit.reminderEnabled;

        this.openModal('habitModal');
    },

    // Reset habit form
    resetHabitForm() {
        const form = document.getElementById('habitForm');
        form.reset();
        
        document.getElementById('selectedIcon').textContent = '💪';
        document.querySelectorAll('.color-option').forEach((opt, i) => {
            opt.classList.toggle('selected', i === 0);
        });
        document.querySelectorAll('.freq-btn').forEach((btn, i) => {
            btn.classList.toggle('active', i === 0);
        });
        document.querySelectorAll('.day-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById('customDaysGroup').style.display = 'none';
        document.getElementById('habitReminderToggle').checked = false;
        document.getElementById('habitReminderTime').disabled = true;
    },

    // Open modal
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    },

    // Close modal
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    },

    // Close all modals
    closeAllModals() {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    },

    // Show confirm dialog
    showConfirm(title, message, callback) {
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        this.confirmCallback = callback;
        this.openModal('confirmModal');
    },

    // Close confirm dialog
    closeConfirm(result) {
        this.closeModal('confirmModal');
        if (this.confirmCallback) {
            this.confirmCallback(result);
            this.confirmCallback = null;
        }
    },

    // Show level up modal
    showLevelUp(newLevel) {
        document.getElementById('newLevelDisplay').textContent = `Level ${newLevel}`;
        this.openModal('levelUpModal');
        Utils.vibrate([100, 50, 100, 50, 100]);
    },

    // Show achievement unlock modal
    showAchievementUnlock(achievement) {
        document.getElementById('unlockedAchievementIcon').textContent = achievement.icon;
        document.getElementById('unlockedAchievementName').textContent = achievement.name;
        document.getElementById('unlockedAchievementDesc').textContent = achievement.description;
        this.openModal('achievementModal');
        Utils.vibrate([50, 30, 50]);
    },

    // Show toast notification
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span class="toast-message">${message}</span>
        `;

        container.appendChild(toast);

        // Remove after delay
        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 200);
        }, 3000);
    },

    // Render habits (alias for Habits.render)
    renderHabits() {
        Habits.render();
    },

    // Render week calendar on home view
    renderHomeWeekCalendar() {
        const container = document.getElementById('homeWeekCalendar');
        if (!container) return;

        const data = Storage.load();
        const weekDays = Utils.getWeekDays();
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        container.innerHTML = weekDays.map((day, index) => {
            let completed = 0;
            let total = 0;
            let statusClass = '';

            if (data && data.habits) {
                data.habits.forEach(habit => {
                    if (habit.enabled && Streaks.wasHabitActiveOnDate(habit, day.date)) {
                        total++;
                        if (habit.completedDates.includes(day.date)) {
                            completed++;
                        }
                    }
                });
            }

            // Determine status class
            if (total > 0) {
                statusClass = 'has-habits';
                if (completed === total) {
                    statusClass += ' completed';
                } else if (completed > 0) {
                    statusClass += ' partial';
                }
            }

            const dayNum = new Date(day.date).getDate();

            return `
                <div class="week-day ${day.isToday ? 'today' : ''} ${statusClass}">
                    <div class="day-name">${dayNames[index]}</div>
                    <div class="day-number">${dayNum}</div>
                    <div class="day-indicator"></div>
                </div>
            `;
        }).join('');
    },

    // Render profile view
    renderProfile() {
        const data = Storage.load();
        if (!data) return;

        const profile = data.profile;
        const stats = data.stats;

        // Profile info
        document.getElementById('profileAvatar').textContent = profile.avatar || '😊';
        document.getElementById('profileName').textContent = profile.username || 'User';
        document.getElementById('joinDate').textContent = Utils.formatDate(profile.joinDate);

        // XP info
        XP.updateUI();

        // Stats
        document.getElementById('totalXP').textContent = stats.totalXP || 0;
        document.getElementById('totalCompleted').textContent = stats.totalCompleted || 0;
        document.getElementById('bestStreak').textContent = Streaks.getBestOverallStreak();
        document.getElementById('achievementCount').textContent = Achievements.getUnlockedCount();
        
        // Days active
        const joinDate = profile.joinDate;
        const daysActive = joinDate ? Utils.getDaysSince(joinDate) : 0;
        document.getElementById('usageDays').textContent = daysActive;

        // Average completion
        const avgCompletion = this.calculateAverageCompletion();
        document.getElementById('avgCompletion').textContent = `${avgCompletion}%`;
    },

    // Calculate average daily completion
    calculateAverageCompletion() {
        const data = Storage.load();
        if (!data || !data.habits || data.habits.length === 0) return 0;

        const today = Utils.getToday();
        const weekAgo = Utils.getDaysAgo(7);
        
        let totalExpected = 0;
        let totalCompleted = 0;

        for (let i = 0; i < 7; i++) {
            const date = Utils.getDaysAgo(i);
            data.habits.forEach(habit => {
                if (habit.enabled && Streaks.wasHabitActiveOnDate(habit, date)) {
                    totalExpected++;
                    if (habit.completedDates.includes(date)) {
                        totalCompleted++;
                    }
                }
            });
        }

        return totalExpected > 0 ? Math.round((totalCompleted / totalExpected) * 100) : 0;
    },

    // Render stats view
    renderStats() {
        this.renderWeekChart();
        this.renderHabitStats();
        this.renderStreaksList();
    },

    // Render week chart
    renderWeekChart() {
        const container = document.getElementById('weekChart');
        if (!container) return;

        const data = Storage.load();
        const weekDays = Utils.getWeekDays();

        container.innerHTML = weekDays.map(day => {
            let completed = 0;
            let total = 0;

            if (data && data.habits) {
                data.habits.forEach(habit => {
                    if (habit.enabled && Streaks.wasHabitActiveOnDate(habit, day.date)) {
                        total++;
                        if (habit.completedDates.includes(day.date)) {
                            completed++;
                        }
                    }
                });
            }

            const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

            return `
                <div class="day-column ${day.isToday ? 'today' : ''}">
                    <div class="day-bar">
                        <div class="day-fill" style="height: ${percentage}%"></div>
                    </div>
                    <span class="day-label">${day.label}</span>
                </div>
            `;
        }).join('');
    },

    // Render habit performance stats
    renderHabitStats() {
        const container = document.getElementById('habitStatsList');
        if (!container) return;

        const data = Storage.load();
        if (!data || !data.habits || data.habits.length === 0) {
            container.innerHTML = '<p class="text-muted text-center">No habits yet</p>';
            return;
        }

        const habitStats = data.habits
            .filter(h => h.enabled)
            .map(habit => ({
                ...habit,
                rate: Utils.calculateCompletionRate(habit)
            }))
            .sort((a, b) => b.rate - a.rate);

        container.innerHTML = habitStats.map(habit => `
            <div class="habit-stat-item">
                <span class="habit-stat-icon">${habit.icon}</span>
                <div class="habit-stat-info">
                    <div class="habit-stat-name">${Habits.escapeHtml(habit.name)}</div>
                    <div class="habit-stat-rate">${habit.rate}% completion</div>
                </div>
                <div class="habit-stat-bar">
                    <div class="habit-stat-fill" style="width: ${habit.rate}%"></div>
                </div>
            </div>
        `).join('');
    },

    // Render streaks leaderboard
    renderStreaksList() {
        const container = document.getElementById('streaksList');
        if (!container) return;

        const leaderboard = Streaks.getStreakLeaderboard();

        if (leaderboard.length === 0) {
            container.innerHTML = '<p class="text-muted text-center">No active streaks</p>';
            return;
        }

        container.innerHTML = leaderboard.slice(0, 5).map(habit => `
            <div class="streak-item">
                <span class="streak-icon">${habit.icon}</span>
                <div class="streak-info">
                    <div class="streak-name">${Habits.escapeHtml(habit.name)}</div>
                </div>
                <div class="streak-value">
                    🔥 ${habit.currentStreak}
                </div>
            </div>
        `).join('');
    },

    // Show install prompt
    showInstallPrompt() {
        document.getElementById('installPrompt').style.display = 'block';
    },

    // Dismiss install prompt
    dismissInstallPrompt() {
        document.getElementById('installPrompt').style.display = 'none';
        localStorage.setItem('installPromptDismissed', 'true');
    }
};
