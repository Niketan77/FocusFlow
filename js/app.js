// Main application initialization and orchestration

class FocusFlowApp {
    constructor() {
        this.version = '1.0.0';
        this.initialized = false;
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }
    
    // Initialize the application
    initialize() {
        if (this.initialized) return;
        
        console.log('🚀 Initializing FocusFlow App v' + this.version);
        
        try {
            // Check browser compatibility
            this.checkCompatibility();
            
            // Initialize offline support
            this.initializeOfflineSupport();
            
            // Initialize push notifications (if supported)
            this.initializeNotifications();
            
            // Setup error handling
            this.setupErrorHandling();
            
            // Setup analytics (privacy-friendly)
            this.setupAnalytics();
            
            // Initialize app data and UI
            this.initializeApp();
            
            // Setup auto-save
            this.setupAutoSave();
            
            // Setup reminders
            this.setupReminders();
            
            // Show onboarding if first time user
            this.checkOnboarding();
            
            this.initialized = true;
            console.log('✅ FocusFlow App initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize app:', error);
            this.handleInitializationError(error);
        }
    }
    
    // Check browser compatibility
    checkCompatibility() {
        const requiredFeatures = [
            'localStorage' in window,
            'JSON' in window,
            'fetch' in window || 'XMLHttpRequest' in window,
            'addEventListener' in document
        ];
        
        const unsupported = requiredFeatures.some(feature => !feature);
        
        if (unsupported) {
            throw new Error('Browser not supported. Please use a modern browser.');
        }
        
        // Check for optional features and warn
        if (!('serviceWorker' in navigator)) {
            console.warn('Service Worker not supported - offline features disabled');
        }
        
        if (!('Notification' in window)) {
            console.warn('Push Notifications not supported');
        }
    }
    
    // Initialize offline support
    initializeOfflineSupport() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('Service Worker registered:', registration);
                })
                .catch(error => {
                    console.warn('Service Worker registration failed:', error);
                });
            
            // Listen for online/offline events
            window.addEventListener('online', () => {
                Utils.showToast('You are back online!', 'success');
                this.syncData();
            });
            
            window.addEventListener('offline', () => {
                Utils.showToast('You are offline. Changes will sync when reconnected.', 'info');
            });
        }
    }
    
    // Initialize push notifications
    initializeNotifications() {
        if ('Notification' in window) {
            // Request permission for notifications
            if (Notification.permission === 'default') {
                // Don't request immediately, wait for user interaction
                this.notificationPermissionRequested = false;
            }
        }
    }
    
    // Request notification permission
    requestNotificationPermission() {
        if ('Notification' in window && !this.notificationPermissionRequested) {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    Utils.showToast('Notifications enabled!', 'success');
                    storage.updateSetting('notifications', true);
                } else {
                    storage.updateSetting('notifications', false);
                }
            });
            this.notificationPermissionRequested = true;
        }
    }
    
    // Setup error handling
    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            console.error('Unhandled error:', event.error);
            this.logError(event.error, 'unhandled');
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.logError(event.reason, 'unhandled-promise');
        });
    }
    
    // Log errors (could be sent to analytics service)
    logError(error, type) {
        const errorData = {
            message: error.message || String(error),
            stack: error.stack,
            type: type,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        // Store locally for debugging
        const errors = JSON.parse(localStorage.getItem('focusflow_errors') || '[]');
        errors.push(errorData);
        
        // Keep only last 10 errors
        if (errors.length > 10) {
            errors.shift();
        }
        
        localStorage.setItem('focusflow_errors', JSON.stringify(errors));
    }
    
    // Setup analytics (privacy-friendly, no tracking)
    setupAnalytics() {
        // Simple usage statistics without personal data
        const stats = {
            sessionStart: Date.now(),
            tasksCreated: 0,
            tasksCompleted: 0,
            projectsCreated: 0
        };
        
        // Track basic usage for improving the app
        window.addEventListener('beforeunload', () => {
            const sessionDuration = Date.now() - stats.sessionStart;
            const sessionData = {
                ...stats,
                sessionDuration,
                date: new Date().toISOString().split('T')[0]
            };
            
            // Store session data locally
            const sessions = JSON.parse(localStorage.getItem('focusflow_sessions') || '[]');
            sessions.push(sessionData);
            
            // Keep only last 30 sessions
            if (sessions.length > 30) {
                sessions.shift();
            }
            
            localStorage.setItem('focusflow_sessions', JSON.stringify(sessions));
        });
        
        this.stats = stats;
    }
    
    // Initialize core app components
    initializeApp() {
        // Components are already initialized via their global instances
        // Just need to trigger initial render
        taskManager.updateUI();
        
        // Set initial view based on saved preference or default
        const savedView = storage.getSetting('currentView', 'today');
        taskManager.setView(savedView);
    }
    
    // Setup auto-save functionality
    setupAutoSave() {
        // Auto-save current view
        const saveCurrentView = Utils.debounce(() => {
            storage.updateSetting('currentView', taskManager.currentView);
        }, 1000);
        
        // Listen for view changes
        const originalSetView = taskManager.setView.bind(taskManager);
        taskManager.setView = function(view) {
            originalSetView(view);
            saveCurrentView();
        };
        
        // Auto-backup data periodically
        this.setupAutoBackup();
    }
    
    // Setup automatic backups
    setupAutoBackup() {
        const lastBackup = storage.getSetting('lastBackup');
        const backupInterval = 7 * 24 * 60 * 60 * 1000; // 7 days
        
        if (!lastBackup || Date.now() - new Date(lastBackup).getTime() > backupInterval) {
            // Create automatic backup
            setTimeout(() => {
                this.createAutomaticBackup();
            }, 5000); // Wait 5 seconds after app load
        }
        
        // Schedule next backup check
        setInterval(() => {
            const lastBackup = storage.getSetting('lastBackup');
            if (!lastBackup || Date.now() - new Date(lastBackup).getTime() > backupInterval) {
                this.createAutomaticBackup();
            }
        }, 24 * 60 * 60 * 1000); // Check daily
    }
    
    // Create automatic backup
    createAutomaticBackup() {
        try {
            const backup = storage.exportData();
            
            // Store in localStorage as emergency backup
            localStorage.setItem('focusflow_auto_backup', JSON.stringify(backup));
            storage.updateSetting('lastBackup', new Date().toISOString());
            
            console.log('Automatic backup created');
        } catch (error) {
            console.error('Failed to create automatic backup:', error);
        }
    }
    
    // Setup task reminders
    setupReminders() {
        // Check for due tasks every minute
        this.reminderInterval = setInterval(() => {
            this.checkReminders();
        }, 60 * 1000);
        
        // Initial check
        setTimeout(() => this.checkReminders(), 5000);
    }
    
    // Check for tasks that need reminders
    checkReminders() {
        if (!storage.getSetting('notifications', true)) return;
        if (Notification.permission !== 'granted') return;
        
        const tasks = storage.getTasks();
        const now = new Date();
        
        tasks.forEach(task => {
            if (task.completed || !task.dueDate) return;
            
            const dueDate = new Date(task.dueDate);
            const timeDiff = dueDate.getTime() - now.getTime();
            const minutesDiff = Math.floor(timeDiff / (1000 * 60));
            
            // Show reminder for tasks due in 15 minutes
            if (minutesDiff === 15) {
                this.showTaskReminder(task, '15 minutes');
            }
            // Show reminder for overdue tasks (once per hour)
            else if (minutesDiff < 0 && Math.abs(minutesDiff) % 60 === 0) {
                this.showTaskReminder(task, 'overdue');
            }
        });
    }
    
    // Show task reminder notification
    showTaskReminder(task, type) {
        const title = type === 'overdue' ? 
            'Overdue Task' : 
            `Task Due in ${type}`;
        
        const notification = new Notification(title, {
            body: task.title,
            icon: '/favicon.ico',
            tag: `reminder-${task.id}`,
            requireInteraction: false
        });
        
        notification.onclick = () => {
            window.focus();
            ui.openTaskModal(task.id);
            notification.close();
        };
        
        // Auto-close after 10 seconds
        setTimeout(() => notification.close(), 10000);
    }
    
    // Check if user needs onboarding
    checkOnboarding() {
        // Always show sample tasks for demo purposes
        this.showOnboarding();
    }
    
    // Show onboarding experience
    showOnboarding() {
        // Clear existing data first
        storage.clearAllData();
        
        // Create sample tasks to demonstrate features
        const sampleTasks = [
            {
                title: 'Welcome to FocusFlow! 👋',
                description: 'This is your first task. Click the checkbox to mark it complete.',
                priority: 'high',
                projectId: 'personal',
                tags: ['welcome']
            },
            {
                title: 'Try natural language input',
                description: 'Type "Meeting with John tomorrow at 3pm" in the quick add box above.',
                priority: 'medium',
                projectId: 'work',
                tags: ['tutorial']
            },
            {
                title: 'Organize with projects',
                description: 'Create new projects in the sidebar to organize your tasks.',
                priority: 'low',
                projectId: 'personal',
                tags: ['organization']
            }
        ];
        
        sampleTasks.forEach(taskData => {
            storage.addTask(taskData);
        });
        
        // Update UI and mark onboarding complete
        taskManager.updateUI();
        storage.updateSetting('onboardingCompleted', true);
        
        Utils.showToast('Welcome to FocusFlow! Sample tasks loaded.', 'success', 5000);
    }
    
    // Sync data (placeholder for future cloud sync)
    syncData() {
        // TODO: Implement cloud synchronization
        console.log('Syncing data...');
        
        // For now, just verify local storage integrity
        this.verifyDataIntegrity();
    }
    
    // Verify data integrity
    verifyDataIntegrity() {
        try {
            const tasks = storage.getTasks();
            const projects = storage.getProjects();
            
            // Check for orphaned tasks (tasks with non-existent projects)
            const projectIds = new Set(projects.map(p => p.id));
            const orphanedTasks = tasks.filter(task => 
                task.projectId && !projectIds.has(task.projectId)
            );
            
            if (orphanedTasks.length > 0) {
                console.warn(`Found ${orphanedTasks.length} orphaned tasks, cleaning up...`);
                orphanedTasks.forEach(task => {
                    storage.updateTask(task.id, { projectId: '' });
                });
            }
            
            console.log('Data integrity check passed');
        } catch (error) {
            console.error('Data integrity check failed:', error);
            this.logError(error, 'data-integrity');
        }
    }
    
    // Handle initialization errors
    handleInitializationError(error) {
        // Show user-friendly error message
        const errorMessage = 'Failed to initialize the app. Please refresh the page.';
        
        // Try to show error in UI if possible
        try {
            document.body.innerHTML = `
                <div style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    background: #f8fafc;
                    color: #1e293b;
                    text-align: center;
                    padding: 20px;
                ">
                    <div>
                        <h1 style="color: #ef4444; margin-bottom: 16px;">⚠️ Initialization Error</h1>
                        <p style="margin-bottom: 24px;">${errorMessage}</p>
                        <button onclick="window.location.reload()" style="
                            background: #3b82f6;
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 8px;
                            cursor: pointer;
                            font-size: 14px;
                        ">Refresh Page</button>
                    </div>
                </div>
            `;
        } catch (e) {
            // Fallback to alert if DOM manipulation fails
            alert(errorMessage);
        }
        
        this.logError(error, 'initialization');
    }
    
    // Get app status
    getStatus() {
        return {
            version: this.version,
            initialized: this.initialized,
            online: navigator.onLine,
            notificationsEnabled: storage.getSetting('notifications', false),
            tasksCount: storage.getTasks().length,
            projectsCount: storage.getProjects().length,
            storageUsage: storage.getStorageUsage()
        };
    }
    
    // Cleanup on app shutdown
    cleanup() {
        if (this.reminderInterval) {
            clearInterval(this.reminderInterval);
        }
        
        console.log('FocusFlow App cleaned up');
    }
}

// Initialize the app
window.app = new FocusFlowApp();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    window.app.cleanup();
});

// Export for debugging
window.FocusFlow = {
    app: window.app,
    storage: window.storage,
    taskManager: window.taskManager,
    projectManager: window.projectManager,
    ui: window.ui,
    utils: window.Utils,
    nlp: window.nlp
};
