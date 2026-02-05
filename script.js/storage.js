/**
 * SoloHabits - Storage Manager
 * Handles all localStorage operations and data persistence
 */

const Storage = {
    STORAGE_KEY: 'solohabits_data',
    
    // Default data structure
    defaultData: {
        habits: [],
        profile: {
            username: 'User',
            avatar: '😊',
            joinDate: null
        },
        stats: {
            totalXP: 0,
            level: 1,
            totalCompleted: 0,
            perfectWeeks: 0
        },
        achievements: [],
        settings: {
            theme: 'system',
            fontSize: 'medium',
            notifications: false,
            reminderTime: '20:00',
            sound: true
        },
        lastResetDate: null,
        weeklyData: {},
        version: '1.0.0'
    },

    // Initialize storage
    init() {
        let data = this.load();
        if (!data) {
            data = Utils.deepClone(this.defaultData);
            data.profile.joinDate = Utils.getToday();
            data.lastResetDate = Utils.getToday();
            this.save(data);
        }
        
        // Migrate if needed
        data = this.migrate(data);
        
        return data;
    },

    // Load data from localStorage
    load() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) {
            console.error('Failed to load data:', e);
            return null;
        }
    },

    // Save data to localStorage
    save(data) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Failed to save data:', e);
            return false;
        }
    },

    // Get specific key from data
    get(key) {
        const data = this.load();
        return data ? data[key] : null;
    },

    // Set specific key in data
    set(key, value) {
        const data = this.load() || Utils.deepClone(this.defaultData);
        data[key] = value;
        return this.save(data);
    },

    // Update nested data
    update(callback) {
        const data = this.load() || Utils.deepClone(this.defaultData);
        callback(data);
        return this.save(data);
    },

    // Migrate data to new version if needed
    migrate(data) {
        // Ensure all required fields exist
        if (!data.habits) data.habits = [];
        if (!data.profile) data.profile = Utils.deepClone(this.defaultData.profile);
        if (!data.stats) data.stats = Utils.deepClone(this.defaultData.stats);
        if (!data.achievements) data.achievements = [];
        if (!data.settings) data.settings = Utils.deepClone(this.defaultData.settings);
        if (!data.weeklyData) data.weeklyData = {};
        
        // Ensure profile has joinDate
        if (!data.profile.joinDate) {
            data.profile.joinDate = Utils.getToday();
        }
        
        // Ensure habits have all required fields
        data.habits = data.habits.map(habit => ({
            id: habit.id || Utils.generateId(),
            name: habit.name || 'Unnamed Habit',
            description: habit.description || '',
            icon: habit.icon || '✨',
            color: habit.color || '#6366f1',
            frequency: habit.frequency || 'daily',
            days: habit.days || [],
            enabled: habit.enabled !== false,
            currentStreak: habit.currentStreak || 0,
            bestStreak: habit.bestStreak || 0,
            lastCompleted: habit.lastCompleted || null,
            completedDates: habit.completedDates || [],
            createdAt: habit.createdAt || Utils.getToday(),
            reminderEnabled: habit.reminderEnabled || false,
            reminderTime: habit.reminderTime || '09:00',
            order: habit.order !== undefined ? habit.order : 0
        }));
        
        this.save(data);
        return data;
    },

    // Export data as JSON
    export() {
        const data = this.load();
        if (!data) return null;
        
        const exportData = {
            ...data,
            exportDate: new Date().toISOString(),
            appName: 'SoloHabits',
            version: '1.0.0'
        };
        
        return JSON.stringify(exportData, null, 2);
    },

    // Import data from JSON
    import(jsonString) {
        try {
            const importedData = JSON.parse(jsonString);
            
            // Validate it's SoloHabits data
            if (!importedData.habits || !importedData.profile) {
                throw new Error('Invalid data format');
            }
            
            // Merge with default structure to ensure all fields exist
            const data = {
                ...Utils.deepClone(this.defaultData),
                ...importedData
            };
            
            // Migrate to ensure proper structure
            this.save(data);
            return this.migrate(data);
        } catch (e) {
            console.error('Failed to import data:', e);
            throw new Error('Invalid backup file');
        }
    },

    // Clear all data
    clear() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            return true;
        } catch (e) {
            console.error('Failed to clear data:', e);
            return false;
        }
    },

    // Reset to default data
    reset() {
        const data = Utils.deepClone(this.defaultData);
        data.profile.joinDate = Utils.getToday();
        data.lastResetDate = Utils.getToday();
        return this.save(data);
    },

    // Get storage usage info
    getStorageInfo() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        const bytes = data ? new Blob([data]).size : 0;
        return {
            bytes,
            kb: (bytes / 1024).toFixed(2),
            mb: (bytes / (1024 * 1024)).toFixed(4)
        };
    }
};
