// Local storage management for the todo app

class Storage {
    constructor() {
        this.STORAGE_KEYS = {
            TASKS: 'focusflow_tasks',
            PROJECTS: 'focusflow_projects',
            SETTINGS: 'focusflow_settings',
            FILTERS: 'focusflow_filters'
        };
        
        // Initialize default data if not exists
        this.initializeDefaults();
    }
    
    // Initialize default data
    initializeDefaults() {
        if (!this.getTasks().length) {
            this.setTasks([]);
        }
        
        if (!this.getProjects().length) {
            this.setProjects([
                {
                    id: 'personal',
                    name: 'Personal',
                    color: '#3b82f6',
                    createdAt: new Date().toISOString()
                },
                {
                    id: 'work',
                    name: 'Work',
                    color: '#10b981',
                    createdAt: new Date().toISOString()
                }
            ]);
        }
        
        if (!this.getSettings()) {
            this.setSettings({
                theme: 'light',
                focusMode: false,
                notifications: true,
                sortBy: 'priority',
                defaultProject: '',
                defaultPriority: 'medium'
            });
        }
    }
    
    // Generic storage methods
    get(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? Utils.safeJsonParse(item, null) : null;
        } catch (error) {
            console.warn(`Failed to get ${key} from storage:`, error);
            return null;
        }
    }
    
    set(key, value) {
        try {
            localStorage.setItem(key, Utils.safeJsonStringify(value));
            return true;
        } catch (error) {
            console.warn(`Failed to set ${key} in storage:`, error);
            return false;
        }
    }
    
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.warn(`Failed to remove ${key} from storage:`, error);
            return false;
        }
    }
    
    // Tasks management
    getTasks() {
        return this.get(this.STORAGE_KEYS.TASKS) || [];
    }
    
    setTasks(tasks) {
        return this.set(this.STORAGE_KEYS.TASKS, tasks);
    }
    
    addTask(task) {
        const tasks = this.getTasks();
        const newTask = {
            id: Utils.generateId(),
            title: task.title,
            description: task.description || '',
            completed: false,
            priority: task.priority || 'medium',
            projectId: task.projectId || '',
            tags: task.tags || [],
            dueDate: task.dueDate || null,
            recurring: task.recurring || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            completedAt: null
        };
        
        tasks.push(newTask);
        this.setTasks(tasks);
        return newTask;
    }
    
    updateTask(taskId, updates) {
        const tasks = this.getTasks();
        const taskIndex = tasks.findIndex(task => task.id === taskId);
        
        if (taskIndex === -1) {
            console.warn(`Task with id ${taskId} not found`);
            return null;
        }
        
        tasks[taskIndex] = {
            ...tasks[taskIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        // Set completion timestamp if task is being marked as completed
        if (updates.completed && !tasks[taskIndex].completedAt) {
            tasks[taskIndex].completedAt = new Date().toISOString();
        } else if (updates.completed === false) {
            tasks[taskIndex].completedAt = null;
        }
        
        this.setTasks(tasks);
        return tasks[taskIndex];
    }
    
    deleteTask(taskId) {
        const tasks = this.getTasks();
        const filteredTasks = tasks.filter(task => task.id !== taskId);
        
        if (filteredTasks.length === tasks.length) {
            console.warn(`Task with id ${taskId} not found`);
            return false;
        }
        
        this.setTasks(filteredTasks);
        return true;
    }
    
    getTask(taskId) {
        const tasks = this.getTasks();
        return tasks.find(task => task.id === taskId) || null;
    }
    
    // Projects management
    getProjects() {
        return this.get(this.STORAGE_KEYS.PROJECTS) || [];
    }
    
    setProjects(projects) {
        return this.set(this.STORAGE_KEYS.PROJECTS, projects);
    }
    
    addProject(project) {
        const projects = this.getProjects();
        const newProject = {
            id: Utils.generateId(),
            name: project.name,
            color: project.color || '#3b82f6',
            description: project.description || '',
            createdAt: new Date().toISOString()
        };
        
        projects.push(newProject);
        this.setProjects(projects);
        return newProject;
    }
    
    updateProject(projectId, updates) {
        const projects = this.getProjects();
        const projectIndex = projects.findIndex(project => project.id === projectId);
        
        if (projectIndex === -1) {
            console.warn(`Project with id ${projectId} not found`);
            return null;
        }
        
        projects[projectIndex] = {
            ...projects[projectIndex],
            ...updates
        };
        
        this.setProjects(projects);
        return projects[projectIndex];
    }
    
    deleteProject(projectId) {
        // Don't allow deletion of default projects
        if (projectId === 'personal' || projectId === 'work') {
            console.warn('Cannot delete default projects');
            return false;
        }
        
        const projects = this.getProjects();
        const filteredProjects = projects.filter(project => project.id !== projectId);
        
        if (filteredProjects.length === projects.length) {
            console.warn(`Project with id ${projectId} not found`);
            return false;
        }
        
        // Update tasks that belong to this project
        const tasks = this.getTasks();
        const updatedTasks = tasks.map(task => {
            if (task.projectId === projectId) {
                return { ...task, projectId: '' };
            }
            return task;
        });
        
        this.setProjects(filteredProjects);
        this.setTasks(updatedTasks);
        return true;
    }
    
    getProject(projectId) {
        const projects = this.getProjects();
        return projects.find(project => project.id === projectId) || null;
    }
    
    // Settings management
    getSettings() {
        return this.get(this.STORAGE_KEYS.SETTINGS);
    }
    
    setSettings(settings) {
        return this.set(this.STORAGE_KEYS.SETTINGS, settings);
    }
    
    updateSetting(key, value) {
        const settings = this.getSettings() || {};
        settings[key] = value;
        return this.setSettings(settings);
    }
    
    getSetting(key, defaultValue = null) {
        const settings = this.getSettings() || {};
        return settings[key] !== undefined ? settings[key] : defaultValue;
    }
    
    // Filters management
    getFilters() {
        return this.get(this.STORAGE_KEYS.FILTERS) || {
            search: '',
            priority: [],
            project: '',
            tags: [],
            overdue: false,
            today: false,
            completed: false
        };
    }
    
    setFilters(filters) {
        return this.set(this.STORAGE_KEYS.FILTERS, filters);
    }
    
    updateFilter(key, value) {
        const filters = this.getFilters();
        filters[key] = value;
        return this.setFilters(filters);
    }
    
    clearFilters() {
        return this.setFilters({
            search: '',
            priority: [],
            project: '',
            tags: [],
            overdue: false,
            today: false,
            completed: false
        });
    }
    
    // Data export/import
    exportData() {
        return {
            tasks: this.getTasks(),
            projects: this.getProjects(),
            settings: this.getSettings(),
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };
    }
    
    importData(data) {
        try {
            if (data.tasks) {
                this.setTasks(data.tasks);
            }
            if (data.projects) {
                this.setProjects(data.projects);
            }
            if (data.settings) {
                this.setSettings(data.settings);
            }
            return true;
        } catch (error) {
            console.error('Failed to import data:', error);
            return false;
        }
    }
    
    // Clear all data
    clearAllData() {
        Object.values(this.STORAGE_KEYS).forEach(key => {
            this.remove(key);
        });
        this.initializeDefaults();
    }
    
    // Get storage usage
    getStorageUsage() {
        let totalSize = 0;
        const usage = {};
        
        Object.entries(this.STORAGE_KEYS).forEach(([name, key]) => {
            const item = localStorage.getItem(key);
            const size = item ? new Blob([item]).size : 0;
            usage[name] = size;
            totalSize += size;
        });
        
        return {
            individual: usage,
            total: totalSize,
            totalKB: (totalSize / 1024).toFixed(2),
            available: this.getAvailableStorage()
        };
    }
    
    // Check available storage
    getAvailableStorage() {
        try {
            const test = 'test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }
    
    // Backup and restore
    createBackup() {
        const backup = this.exportData();
        const blob = new Blob([Utils.safeJsonStringify(backup, '{}')], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `focusflow-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    // Sync status (for future cloud sync implementation)
    getSyncStatus() {
        return {
            lastSync: this.get('lastSync'),
            syncEnabled: false, // Will be true when cloud sync is implemented
            pendingChanges: 0
        };
    }
    
    // Get all tags from tasks
    getAllTags() {
        const tasks = this.getTasks();
        const tagsSet = new Set();
        
        tasks.forEach(task => {
            if (task.tags) {
                task.tags.forEach(tag => tagsSet.add(tag));
            }
        });
        
        return Array.from(tagsSet).sort();
    }
    
    // Get task statistics
    getTaskStats() {
        const tasks = this.getTasks();
        return Utils.calculateStats(tasks);
    }
}

// Create and export storage instance
window.storage = new Storage();
