/**
 * SoloHabits - Main Application Controller
 * Initializes all modules and handles app lifecycle
 */

const App = {
    // PWA install prompt event
    deferredPrompt: null,

    // Initialize the application
    init() {
        console.log('🚀 SoloHabits initializing...');

        // Initialize storage first
        Storage.init();

        // Initialize UI
        UI.init();

        // Perform daily reset check
        this.checkDailyReset();

        // Check for broken streaks
        Streaks.checkBrokenStreaks();

        // Render initial content
        this.renderInitialContent();

        // Load settings
        Settings.loadSettingsUI();

        // Initialize notifications
        Notifications.initializeReminders();

        // Check for missed habits
        setTimeout(() => {
            Notifications.checkMissedHabits();
        }, 2000);

        // Setup PWA
        this.setupPWA();

        // Listen for theme changes
        this.watchSystemTheme();

        // Setup visibility change handler
        this.setupVisibilityHandler();

        console.log('✅ SoloHabits ready!');
    },

    // Check and perform daily reset
    checkDailyReset() {
        const data = Storage.load();
        if (!data) return;

        const needsReset = Utils.checkDailyReset(data.lastResetDate);
        
        if (needsReset) {
            console.log('📅 Performing daily reset...');
            
            // Update last reset date
            Storage.update(d => {
                d.lastResetDate = Utils.getToday();
            });

            // Check for broken streaks
            Streaks.checkBrokenStreaks();

            // Check for perfect week
            XP.checkPerfectWeek();
        }
    },

    // Render initial content
    renderInitialContent() {
        // Render week calendar
        UI.renderHomeWeekCalendar();

        // Render habits
        Habits.render();

        // Update XP display
        XP.updateUI();

        // Render achievements
        Achievements.renderAll();
    },

    // Setup PWA functionality
    setupPWA() {
        // Register service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('service-worker.js')
                .then(registration => {
                    console.log('✅ Service Worker registered:', registration.scope);

                    // Check for updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // New version available
                                UI.showToast('New version available! Refresh to update.', 'info');
                            }
                        });
                    });
                })
                .catch(error => {
                    console.error('❌ Service Worker registration failed:', error);
                });
        }

        // Handle install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            
            // Show install prompt if not dismissed
            if (!localStorage.getItem('installPromptDismissed')) {
                setTimeout(() => {
                    UI.showInstallPrompt();
                }, 3000);
            }
        });

        // Setup install button
        const installBtn = document.getElementById('installBtn');
        if (installBtn) {
            installBtn.addEventListener('click', () => this.installPWA());
        }

        // Handle app installed
        window.addEventListener('appinstalled', () => {
            console.log('✅ PWA installed');
            this.deferredPrompt = null;
            UI.dismissInstallPrompt();
            UI.showToast('App installed successfully!', 'success');
        });
    },

    // Install PWA
    async installPWA() {
        if (!this.deferredPrompt) {
            console.log('No install prompt available');
            return;
        }

        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        
        console.log(`Install prompt outcome: ${outcome}`);
        
        if (outcome === 'accepted') {
            UI.dismissInstallPrompt();
        }
        
        this.deferredPrompt = null;
    },

    // Watch for system theme changes
    watchSystemTheme() {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        const handleChange = () => {
            const data = Storage.load();
            if (data?.settings?.theme === 'system') {
                Settings.applyTheme('system');
            }
        };

        mediaQuery.addEventListener('change', handleChange);
    },

    // Setup visibility change handler
    setupVisibilityHandler() {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                // App became visible, check for daily reset
                this.checkDailyReset();
                
                // Refresh current view
                UI.refreshViewContent(UI.currentView);
            }
        });
    },

    // Get app version
    getVersion() {
        return '1.0.0';
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Handle offline/online status
window.addEventListener('online', () => {
    UI.showToast('Back online!', 'success');
});

window.addEventListener('offline', () => {
    UI.showToast('You are offline. Changes will be saved locally.', 'warning');
});
