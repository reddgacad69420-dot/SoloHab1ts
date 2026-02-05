/**
 * SoloHabits - Notification System
 * Handles push notifications, reminders, and alerts
 */

const Notifications = {
    // Scheduled notification timers
    scheduledTimers: {},

    // Check if notifications are supported
    isSupported() {
        return 'Notification' in window;
    },

    // Check current permission status
    getPermission() {
        if (!this.isSupported()) return 'unsupported';
        return Notification.permission;
    },

    // Request notification permission
    async requestPermission() {
        if (!this.isSupported()) {
            return { granted: false, reason: 'unsupported' };
        }

        if (Notification.permission === 'granted') {
            return { granted: true };
        }

        if (Notification.permission === 'denied') {
            return { granted: false, reason: 'denied' };
        }

        try {
            const permission = await Notification.requestPermission();
            return { granted: permission === 'granted', permission };
        } catch (e) {
            console.error('Failed to request notification permission:', e);
            return { granted: false, reason: 'error' };
        }
    },

    // Show a notification
    show(title, options = {}) {
        if (!this.isSupported() || Notification.permission !== 'granted') {
            console.log('Notifications not available');
            return null;
        }

        const defaultOptions = {
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-72.png',
            vibrate: [100, 50, 100],
            tag: 'solohabits-' + Date.now(),
            renotify: true,
            requireInteraction: false,
            ...options
        };

        try {
            const notification = new Notification(title, defaultOptions);
            
            notification.onclick = () => {
                window.focus();
                notification.close();
                if (options.onClick) options.onClick();
            };

            // Auto close after 5 seconds
            setTimeout(() => notification.close(), 5000);

            return notification;
        } catch (e) {
            console.error('Failed to show notification:', e);
            return null;
        }
    },

    // Test notification
    testNotification() {
        const permission = this.getPermission();
        
        if (permission === 'unsupported') {
            UI.showToast('Notifications not supported in this browser', 'error');
            return;
        }

        if (permission === 'denied') {
            UI.showToast('Notification permission denied. Please enable in browser settings.', 'error');
            return;
        }

        if (permission === 'default') {
            this.requestPermission().then(result => {
                if (result.granted) {
                    this.showTestNotification();
                } else {
                    UI.showToast('Please allow notifications to use reminders', 'warning');
                }
            });
        } else {
            this.showTestNotification();
        }
    },

    // Show test notification
    showTestNotification() {
        this.show('SoloHabits Test', {
            body: 'Notifications are working! 🎉',
            icon: '/icons/icon-192.png'
        });
        UI.showToast('Test notification sent!', 'success');
    },

    // Schedule daily reminder
    scheduleDailyReminder(time) {
        this.clearScheduledReminder('daily');

        const [hours, minutes] = time.split(':').map(Number);
        const now = new Date();
        let scheduledTime = new Date(now);
        scheduledTime.setHours(hours, minutes, 0, 0);

        // If time has passed today, schedule for tomorrow
        if (scheduledTime <= now) {
            scheduledTime.setDate(scheduledTime.getDate() + 1);
        }

        const delay = scheduledTime - now;

        this.scheduledTimers.daily = setTimeout(() => {
            this.showDailyReminder();
            // Reschedule for next day
            this.scheduleDailyReminder(time);
        }, delay);

        console.log(`Daily reminder scheduled for ${scheduledTime.toLocaleString()}`);
    },

    // Show daily reminder notification
    showDailyReminder() {
        const stats = Habits.getTodayStats();
        const remaining = stats.total - stats.completed;

        if (remaining > 0) {
            this.show('Time to Build Habits! ⏰', {
                body: `You have ${remaining} habit${remaining > 1 ? 's' : ''} left today. Keep going!`,
                tag: 'daily-reminder'
            });
        } else if (stats.total > 0) {
            this.show('Amazing Job! 🎉', {
                body: "You've completed all your habits for today!",
                tag: 'daily-complete'
            });
        }
    },

    // Schedule per-habit reminder
    scheduleHabitReminder(habit) {
        if (!habit.reminderEnabled || !habit.reminderTime) return;

        this.clearScheduledReminder(`habit-${habit.id}`);

        const [hours, minutes] = habit.reminderTime.split(':').map(Number);
        const now = new Date();
        let scheduledTime = new Date(now);
        scheduledTime.setHours(hours, minutes, 0, 0);

        // If time has passed today, schedule for tomorrow
        if (scheduledTime <= now) {
            scheduledTime.setDate(scheduledTime.getDate() + 1);
        }

        const delay = scheduledTime - now;

        this.scheduledTimers[`habit-${habit.id}`] = setTimeout(() => {
            this.showHabitReminder(habit);
            // Reschedule for next day
            this.scheduleHabitReminder(habit);
        }, delay);

        console.log(`Habit reminder for "${habit.name}" scheduled for ${scheduledTime.toLocaleString()}`);
    },

    // Show habit-specific reminder
    showHabitReminder(habit) {
        // Only show if habit is not completed today and is active today
        if (!Utils.isCompletedToday(habit) && Utils.isHabitActiveToday(habit)) {
            this.show(`Time for: ${habit.name}`, {
                body: habit.description || `Don't forget to complete your habit!`,
                icon: '/icons/icon-192.png',
                tag: `habit-${habit.id}`,
                data: { habitId: habit.id }
            });
        }
    },

    // Clear a scheduled reminder
    clearScheduledReminder(key) {
        if (this.scheduledTimers[key]) {
            clearTimeout(this.scheduledTimers[key]);
            delete this.scheduledTimers[key];
        }
    },

    // Clear all scheduled reminders
    clearAllReminders() {
        Object.keys(this.scheduledTimers).forEach(key => {
            clearTimeout(this.scheduledTimers[key]);
        });
        this.scheduledTimers = {};
    },

    // Initialize all reminders based on settings
    initializeReminders() {
        const data = Storage.load();
        if (!data) return;

        // Clear existing
        this.clearAllReminders();

        // Check permission
        if (this.getPermission() !== 'granted') {
            return;
        }

        // Schedule daily reminder if enabled
        if (data.settings.notifications && data.settings.reminderTime) {
            this.scheduleDailyReminder(data.settings.reminderTime);
        }

        // Schedule per-habit reminders
        data.habits.forEach(habit => {
            if (habit.reminderEnabled && habit.reminderTime) {
                this.scheduleHabitReminder(habit);
            }
        });
    },

    // Show missed habit alert
    showMissedHabitAlert(habitName) {
        this.show('Missed Habit ⚠️', {
            body: `You missed "${habitName}" yesterday. Don't break the chain!`,
            tag: 'missed-habit'
        });
    },

    // Show motivational notification
    showMotivationalNotification() {
        const messages = [
            { title: 'Keep Going! 💪', body: 'Every small step counts towards your goals.' },
            { title: 'You\'re Doing Great! ⭐', body: 'Consistency is the key to success.' },
            { title: 'Stay Focused! 🎯', body: 'Your habits are shaping your future.' },
            { title: 'Don\'t Give Up! 🔥', body: 'Champions are made one day at a time.' }
        ];

        const msg = messages[Math.floor(Math.random() * messages.length)];
        this.show(msg.title, {
            body: msg.body,
            tag: 'motivation'
        });
    },

    // Check and notify about missed habits on app open
    checkMissedHabits() {
        const data = Storage.load();
        if (!data || !data.habits) return;

        const yesterday = Utils.getDaysAgo(1);
        const missedHabits = data.habits.filter(habit => {
            if (!habit.enabled) return false;
            // Check if habit was supposed to be done yesterday
            const wasActive = Streaks.wasHabitActiveOnDate(habit, yesterday);
            // Check if it wasn't completed
            const wasCompleted = habit.completedDates.includes(yesterday);
            return wasActive && !wasCompleted;
        });

        // Show notification for first missed habit
        if (missedHabits.length > 0 && this.getPermission() === 'granted') {
            const settings = data.settings;
            if (settings.notifications) {
                if (missedHabits.length === 1) {
                    this.showMissedHabitAlert(missedHabits[0].name);
                } else {
                    this.show('Missed Habits ⚠️', {
                        body: `You missed ${missedHabits.length} habits yesterday. Let's get back on track!`,
                        tag: 'missed-habits'
                    });
                }
            }
        }
    }
};

// Settings module for notification-related settings
const Settings = {
    // Set theme
    setTheme(theme) {
        Storage.update(data => {
            data.settings.theme = theme;
        });
        this.applyTheme(theme);
    },

    // Apply theme to document
    applyTheme(theme) {
        const root = document.documentElement;
        
        if (theme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        } else {
            root.setAttribute('data-theme', theme);
        }

        // Update theme-color meta tag
        const themeColor = getComputedStyle(root).getPropertyValue('--primary').trim();
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor || '#6366f1');
    },

    // Set font size
    setFontSize(size) {
        Storage.update(data => {
            data.settings.fontSize = size;
        });
        document.documentElement.setAttribute('data-font-size', size);
    },

    // Toggle notifications
    async toggleNotifications(enabled) {
        if (enabled) {
            const result = await Notifications.requestPermission();
            if (!result.granted) {
                document.getElementById('notificationsToggle').checked = false;
                UI.showToast('Please allow notifications in your browser settings', 'warning');
                return;
            }
        }

        Storage.update(data => {
            data.settings.notifications = enabled;
        });

        if (enabled) {
            Notifications.initializeReminders();
            UI.showToast('Notifications enabled', 'success');
        } else {
            Notifications.clearAllReminders();
            UI.showToast('Notifications disabled', 'success');
        }
    },

    // Set reminder time
    setReminderTime(time) {
        Storage.update(data => {
            data.settings.reminderTime = time;
        });

        const data = Storage.load();
        if (data.settings.notifications) {
            Notifications.scheduleDailyReminder(time);
        }
    },

    // Toggle sound
    toggleSound(enabled) {
        Storage.update(data => {
            data.settings.sound = enabled;
        });
    },

    // Export data
    exportData() {
        const jsonData = Storage.export();
        if (!jsonData) {
            UI.showToast('No data to export', 'error');
            return;
        }

        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `solohabits-backup-${Utils.getToday()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        UI.showToast('Data exported successfully!', 'success');
    },

    // Trigger import file dialog
    importData() {
        document.getElementById('importFile').click();
    },

    // Handle import file selection
    handleImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                Storage.import(e.target.result);
                UI.showToast('Data imported successfully!', 'success');
                // Reload the app
                setTimeout(() => window.location.reload(), 1000);
            } catch (err) {
                UI.showToast('Failed to import: ' + err.message, 'error');
            }
        };
        reader.onerror = () => {
            UI.showToast('Failed to read file', 'error');
        };
        reader.readAsText(file);

        // Reset file input
        event.target.value = '';
    },

    // Reset all data
    resetData() {
        UI.showConfirm(
            'Reset All Data',
            'This will delete ALL your data including habits, achievements, and progress. This cannot be undone!',
            (confirmed) => {
                if (confirmed) {
                    Storage.reset();
                    UI.showToast('All data has been reset', 'success');
                    setTimeout(() => window.location.reload(), 1000);
                }
            }
        );
    },

    // Load settings into UI
    loadSettingsUI() {
        const data = Storage.load();
        if (!data) return;

        const settings = data.settings;

        // Theme
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) themeSelect.value = settings.theme || 'system';
        this.applyTheme(settings.theme || 'system');

        // Font size
        const fontSizeSelect = document.getElementById('fontSizeSelect');
        if (fontSizeSelect) fontSizeSelect.value = settings.fontSize || 'medium';
        document.documentElement.setAttribute('data-font-size', settings.fontSize || 'medium');

        // Notifications
        const notificationsToggle = document.getElementById('notificationsToggle');
        if (notificationsToggle) notificationsToggle.checked = settings.notifications || false;

        // Reminder time
        const reminderTime = document.getElementById('reminderTime');
        if (reminderTime) reminderTime.value = settings.reminderTime || '20:00';

        // Sound
        const soundToggle = document.getElementById('soundToggle');
        if (soundToggle) soundToggle.checked = settings.sound !== false;
    }
};
