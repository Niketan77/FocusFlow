// UI management and interactions

class UIManager {
    constructor() {
        this.currentTaskId = null;
        this.focusMode = storage.getSetting('focusMode', false);
        this.theme = storage.getSetting('theme', 'light');
        
        // Initialize UI
        this.initializeUI();
        this.attachEventListeners();
        this.applyTheme();
        this.applyFocusMode();
    }
    
    // Initialize UI components
    initializeUI() {
        // Set initial focus mode button state
        const focusModeBtn = document.getElementById('focusModeBtn');
        if (this.focusMode) {
            focusModeBtn.classList.add('active');
        }
        
        // Initialize filter dropdown
        this.initializeFilterDropdown();
        
        // Initialize search debouncing
        this.initializeSearch();
        
        // Initialize quick add options
        this.initializeQuickAdd();
        
        // Load initial data
        taskManager.updateUI();
    }
    
    // Attach all event listeners
    attachEventListeners() {
        // Navigation
        this.attachNavigationListeners();
        
        // Quick add
        this.attachQuickAddListeners();
        
        // Search and filters
        this.attachSearchListeners();
        
        // Header controls
        this.attachHeaderListeners();
        
        // Modal controls
        this.attachModalListeners();
        
        // Keyboard shortcuts
        this.attachKeyboardListeners();
        
        // Toast close
        this.attachToastListeners();
    }
    
    // Navigation event listeners
    attachNavigationListeners() {
        // View navigation
        document.querySelectorAll('[data-view]').forEach(item => {
            if (!item.dataset.view.startsWith('project-')) {
                item.addEventListener('click', () => {
                    taskManager.setView(item.dataset.view);
                });
            }
        });
        
        // Add project button
        document.getElementById('addProjectBtn').addEventListener('click', () => {
            projectManager.openProjectModal();
        });
    }
    
    // Quick add event listeners
    attachQuickAddListeners() {
        const quickAddInput = document.getElementById('quickAddInput');
        const addTaskBtn = document.getElementById('addTaskBtn');
        const quickAddOptions = document.getElementById('quickAddOptions');
        
        // Add task button
        addTaskBtn.addEventListener('click', () => {
            this.handleQuickAdd();
        });
        
        // Enter key in input
        quickAddInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.handleQuickAdd();
            }
        });
        
        // Show/hide advanced options
        quickAddInput.addEventListener('input', (e) => {
            const hasValue = e.target.value.trim().length > 0;
            quickAddOptions.style.display = hasValue ? 'block' : 'none';
            
            // Parse natural language if there's input
            if (hasValue) {
                this.handleNaturalLanguageInput(e.target.value);
            }
        });
        
        // Focus input on load
        quickAddInput.focus();
    }
    
    // Search and filter event listeners
    attachSearchListeners() {
        const searchInput = document.getElementById('searchInput');
        const filterBtn = document.getElementById('filterBtn');
        const filterDropdown = document.getElementById('filterDropdown');
        
        // Search input with debouncing
        searchInput.addEventListener('input', 
            Utils.debounce((e) => {
                taskManager.searchTasks(e.target.value);
            }, 300)
        );
        
        // Filter dropdown toggle
        filterBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            filterDropdown.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            filterDropdown.classList.remove('show');
        });
        
        // Filter options
        filterDropdown.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                this.handleFilterChange();
            }
        });
    }
    
    // Header controls event listeners
    attachHeaderListeners() {
        // Focus mode toggle
        document.getElementById('focusModeBtn').addEventListener('click', () => {
            this.toggleFocusMode();
        });
        
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });
    }
    
    // Modal event listeners
    attachModalListeners() {
        const modalOverlay = document.getElementById('modalOverlay');
        const closeModal = document.getElementById('closeModal');
        const cancelEdit = document.getElementById('cancelEdit');
        const saveTask = document.getElementById('saveTask');
        const deleteTask = document.getElementById('deleteTask');
        const recurringCheckbox = document.getElementById('editTaskRecurring');
        const recurrenceSelect = document.getElementById('editTaskRecurrence');
        
        // Close modal
        const closeModalHandler = () => {
            this.closeTaskModal();
        };
        
        closeModal.addEventListener('click', closeModalHandler);
        cancelEdit.addEventListener('click', closeModalHandler);
        
        // Close on overlay click
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeModalHandler();
            }
        });
        
        // Save task
        saveTask.addEventListener('click', () => {
            this.handleTaskSave();
        });
        
        // Delete task
        deleteTask.addEventListener('click', () => {
            this.handleTaskDelete();
        });
        
        // Recurring task toggle
        recurringCheckbox.addEventListener('change', (e) => {
            recurrenceSelect.style.display = e.target.checked ? 'block' : 'none';
        });
        
        // Enter key to save
        modalOverlay.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                this.handleTaskSave();
            }
        });
    }
    
    // Keyboard shortcuts
    attachKeyboardListeners() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K for command palette (future feature)
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                // TODO: Open command palette
            }
            
            // Ctrl/Cmd + N for new task
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                document.getElementById('quickAddInput').focus();
            }
            
            // Escape to close modals
            if (e.key === 'Escape') {
                this.closeTaskModal();
                document.getElementById('filterDropdown').classList.remove('show');
            }
            
            // F for focus mode
            if (e.key === 'f' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                this.toggleFocusMode();
            }
        });
    }
    
    // Toast event listeners
    attachToastListeners() {
        document.getElementById('toastClose').addEventListener('click', () => {
            document.getElementById('toast').style.display = 'none';
        });
    }
    
    // Handle quick add task
    handleQuickAdd() {
        const input = document.getElementById('quickAddInput');
        const text = input.value.trim();
        
        if (!text) return;
        
        // Parse natural language
        const parsed = nlp.parseTaskInput(text);
        
        // Get additional form values
        const projectId = document.getElementById('taskProject').value;
        const priority = document.getElementById('taskPriority').value;
        const dueDate = document.getElementById('taskDueDate').value;
        const tags = document.getElementById('taskTags').value
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);
        
        // Create task object
        const taskData = {
            title: parsed.title,
            projectId: projectId || parsed.projectId,
            priority: priority || parsed.priority,
            dueDate: dueDate || (parsed.dueDate ? parsed.dueDate.toISOString() : null),
            tags: tags.length > 0 ? tags : parsed.tags
        };
        
        // Create task
        taskManager.createTask(taskData);
        
        // Clear form
        this.clearQuickAddForm();
    }
    
    // Handle natural language input
    handleNaturalLanguageInput(text) {
        const parsed = nlp.parseTaskInput(text);
        
        // Update form fields with suggestions
        if (parsed.suggestions.projectId) {
            document.getElementById('taskProject').value = parsed.suggestions.projectId;
        }
        
        if (parsed.suggestions.priority) {
            document.getElementById('taskPriority').value = parsed.suggestions.priority;
        }
        
        if (parsed.suggestions.dueDate) {
            const dateInput = document.getElementById('taskDueDate');
            dateInput.value = new Date(parsed.suggestions.dueDate.getTime() - 
                parsed.suggestions.dueDate.getTimezoneOffset() * 60000)
                .toISOString().slice(0, 16);
        }
        
        if (parsed.suggestions.tags.length > 0) {
            document.getElementById('taskTags').value = parsed.suggestions.tags.join(', ');
        }
    }
    
    // Clear quick add form
    clearQuickAddForm() {
        document.getElementById('quickAddInput').value = '';
        document.getElementById('taskProject').value = '';
        document.getElementById('taskPriority').value = 'medium';
        document.getElementById('taskDueDate').value = '';
        document.getElementById('taskTags').value = '';
        document.getElementById('quickAddOptions').style.display = 'none';
        
        // Focus back on input
        document.getElementById('quickAddInput').focus();
    }
    
    // Handle filter changes
    handleFilterChange() {
        const filterDropdown = document.getElementById('filterDropdown');
        const checkboxes = filterDropdown.querySelectorAll('input[type="checkbox"]');
        
        const filters = {};
        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                const value = checkbox.value;
                if (['high', 'medium', 'low'].includes(value)) {
                    if (!filters.priority) filters.priority = [];
                    filters.priority.push(value);
                } else if (value === 'overdue') {
                    filters.overdue = true;
                } else if (value === 'today') {
                    filters.today = true;
                }
            }
        });
        
        taskManager.updateFilters(filters);
    }
    
    // Open task modal for editing
    openTaskModal(taskId = null) {
        this.currentTaskId = taskId;
        const isEdit = taskId !== null;
        const task = isEdit ? storage.getTask(taskId) : null;
        
        // Update modal title
        document.getElementById('modalTitle').textContent = isEdit ? 'Edit Task' : 'New Task';
        
        // Populate form fields
        document.getElementById('editTaskName').value = task ? task.title : '';
        document.getElementById('editTaskDescription').value = task ? task.description || '' : '';
        document.getElementById('editTaskProject').value = task ? task.projectId || '' : '';
        document.getElementById('editTaskPriority').value = task ? task.priority : 'medium';
        
        // Set due date
        if (task && task.dueDate) {
            const date = new Date(task.dueDate);
            document.getElementById('editTaskDueDate').value = 
                new Date(date.getTime() - date.getTimezoneOffset() * 60000)
                .toISOString().slice(0, 16);
        } else {
            document.getElementById('editTaskDueDate').value = '';
        }
        
        // Set tags
        document.getElementById('editTaskTags').value = 
            task && task.tags ? task.tags.join(', ') : '';
        
        // Set recurring
        const isRecurring = task && task.recurring;
        document.getElementById('editTaskRecurring').checked = isRecurring;
        document.getElementById('editTaskRecurrence').style.display = isRecurring ? 'block' : 'none';
        if (isRecurring) {
            document.getElementById('editTaskRecurrence').value = task.recurring;
        }
        
        // Show/hide delete button
        document.getElementById('deleteTask').style.display = isEdit ? 'inline-flex' : 'none';
        
        // Show modal
        document.getElementById('modalOverlay').style.display = 'flex';
        document.getElementById('editTaskName').focus();
    }
    
    // Close task modal
    closeTaskModal() {
        document.getElementById('modalOverlay').style.display = 'none';
        this.currentTaskId = null;
    }
    
    // Handle task save
    handleTaskSave() {
        const name = document.getElementById('editTaskName').value.trim();
        const description = document.getElementById('editTaskDescription').value.trim();
        const projectId = document.getElementById('editTaskProject').value;
        const priority = document.getElementById('editTaskPriority').value;
        const dueDate = document.getElementById('editTaskDueDate').value;
        const tags = document.getElementById('editTaskTags').value
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);
        const recurring = document.getElementById('editTaskRecurring').checked ? 
            document.getElementById('editTaskRecurrence').value : null;
        
        if (!name) {
            Utils.showToast('Please enter a task name', 'error');
            return;
        }
        
        const taskData = {
            title: name,
            description,
            projectId,
            priority,
            dueDate: dueDate ? new Date(dueDate).toISOString() : null,
            tags,
            recurring
        };
        
        if (this.currentTaskId) {
            taskManager.updateTask(this.currentTaskId, taskData);
        } else {
            taskManager.createTask(taskData);
        }
        
        this.closeTaskModal();
    }
    
    // Handle task delete
    handleTaskDelete() {
        if (this.currentTaskId && confirm('Are you sure you want to delete this task?')) {
            taskManager.deleteTask(this.currentTaskId);
            this.closeTaskModal();
        }
    }
    
    // Toggle focus mode
    toggleFocusMode() {
        this.focusMode = !this.focusMode;
        storage.updateSetting('focusMode', this.focusMode);
        this.applyFocusMode();
        
        const message = this.focusMode ? 'Focus mode enabled' : 'Focus mode disabled';
        Utils.showToast(message, 'info');
    }
    
    // Apply focus mode
    applyFocusMode() {
        const body = document.body;
        const focusModeBtn = document.getElementById('focusModeBtn');
        
        if (this.focusMode) {
            body.classList.add('focus-mode');
            focusModeBtn.classList.add('active');
        } else {
            body.classList.remove('focus-mode');
            focusModeBtn.classList.remove('active');
        }
    }
    
    // Toggle theme
    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        storage.updateSetting('theme', this.theme);
        this.applyTheme();
        
        Utils.showToast(`${this.theme} theme enabled`, 'info');
    }
    
    // Apply theme
    applyTheme() {
        const body = document.body;
        const themeToggle = document.getElementById('themeToggle');
        
        body.setAttribute('data-theme', this.theme);
        
        // Update theme toggle icon
        const icon = themeToggle.querySelector('.icon');
        icon.textContent = this.theme === 'light' ? '🌙' : '☀️';
    }
    
    // Initialize filter dropdown
    initializeFilterDropdown() {
        const filters = storage.getFilters();
        const filterDropdown = document.getElementById('filterDropdown');
        
        // Set initial filter states
        filterDropdown.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            const value = checkbox.value;
            if (['high', 'medium', 'low'].includes(value)) {
                checkbox.checked = filters.priority && filters.priority.includes(value);
            } else if (value === 'overdue') {
                checkbox.checked = filters.overdue;
            } else if (value === 'today') {
                checkbox.checked = filters.today;
            }
        });
    }
    
    // Initialize search
    initializeSearch() {
        const searchInput = document.getElementById('searchInput');
        const filters = storage.getFilters();
        
        if (filters.search) {
            searchInput.value = filters.search;
        }
    }
    
    // Initialize quick add
    initializeQuickAdd() {
        // Update project selects
        projectManager.updateProjectSelects();
        
        // Set default values from settings
        const defaultProject = storage.getSetting('defaultProject', '');
        const defaultPriority = storage.getSetting('defaultPriority', 'medium');
        
        if (defaultProject) {
            document.getElementById('taskProject').value = defaultProject;
        }
        
        document.getElementById('taskPriority').value = defaultPriority;
    }
    
    // Show loading state
    showLoading(message = 'Loading...') {
        // TODO: Implement loading overlay
        console.log('Loading:', message);
    }
    
    // Hide loading state
    hideLoading() {
        // TODO: Implement loading overlay
        console.log('Loading complete');
    }
    
    // Export data
    exportData() {
        const data = storage.exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `focusflow-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        Utils.showToast('Data exported successfully!', 'success');
    }
    
    // Import data
    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (storage.importData(data)) {
                        taskManager.updateUI();
                        Utils.showToast('Data imported successfully!', 'success');
                    } else {
                        Utils.showToast('Failed to import data', 'error');
                    }
                } catch (error) {
                    console.error('Import error:', error);
                    Utils.showToast('Invalid file format', 'error');
                }
            };
            reader.readAsText(file);
        });
        
        input.click();
    }
}

// Create and export UI manager instance
window.ui = new UIManager();
