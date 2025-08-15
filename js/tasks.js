// Task management functions

class TaskManager {
    constructor() {
        this.currentView = 'today';
        this.currentFilters = storage.getFilters();
        this.sortBy = storage.getSetting('sortBy', 'priority');
        
        // Bind methods
        this.handleTaskComplete = this.handleTaskComplete.bind(this);
        this.handleTaskEdit = this.handleTaskEdit.bind(this);
        this.handleTaskDelete = this.handleTaskDelete.bind(this);
    }
    
    // Get tasks based on current view and filters
    getFilteredTasks() {
        let tasks = storage.getTasks();
        
        // Filter by view
        switch (this.currentView) {
            case 'today':
                tasks = tasks.filter(task => 
                    !task.completed && (
                        Utils.isToday(task.dueDate) || 
                        Utils.isOverdue(task.dueDate) ||
                        !task.dueDate
                    )
                );
                break;
            case 'upcoming':
                tasks = tasks.filter(task => 
                    !task.completed && Utils.isUpcoming(task.dueDate)
                );
                break;
            case 'completed':
                tasks = tasks.filter(task => task.completed);
                break;
            case 'project':
                if (this.currentFilters.project) {
                    tasks = tasks.filter(task => 
                        task.projectId === this.currentFilters.project
                    );
                }
                break;
        }
        
        // Apply additional filters
        tasks = Utils.filterTasks(tasks, this.currentFilters);
        
        // Sort tasks
        tasks = Utils.sortTasks(tasks, this.sortBy);
        
        return tasks;
    }
    
    // Create a new task
    createTask(taskData) {
        const task = storage.addTask(taskData);
        this.updateUI();
        Utils.showToast('Task created successfully!', 'success');
        return task;
    }
    
    // Update an existing task
    updateTask(taskId, updates) {
        const task = storage.updateTask(taskId, updates);
        if (task) {
            this.updateUI();
            Utils.showToast('Task updated successfully!', 'success');
        }
        return task;
    }
    
    // Delete a task
    deleteTask(taskId) {
        const success = storage.deleteTask(taskId);
        if (success) {
            this.updateUI();
            Utils.showToast('Task deleted successfully!', 'success');
        }
        return success;
    }
    
    // Toggle task completion
    toggleTaskCompletion(taskId) {
        const task = storage.getTask(taskId);
        if (!task) return false;
        
        const updatedTask = this.updateTask(taskId, { 
            completed: !task.completed 
        });
        
        if (updatedTask) {
            const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
            if (taskElement) {
                Utils.animateElement(taskElement, 'completing');
            }
        }
        
        return updatedTask;
    }
    
    // Set current view
    setView(view) {
        this.currentView = view;
        this.updateViewTitle();
        this.updateUI();
        this.updateNavigation();
    }
    
    // Set project view
    setProjectView(projectId) {
        this.currentView = 'project';
        this.currentFilters.project = projectId;
        storage.setFilters(this.currentFilters);
        this.updateViewTitle();
        this.updateUI();
        this.updateNavigation();
    }
    
    // Update filters
    updateFilters(newFilters) {
        this.currentFilters = { ...this.currentFilters, ...newFilters };
        storage.setFilters(this.currentFilters);
        this.updateUI();
    }
    
    // Clear filters
    clearFilters() {
        this.currentFilters = storage.getFilters();
        storage.clearFilters();
        this.updateUI();
    }
    
    // Update sort order
    setSortBy(sortBy) {
        this.sortBy = sortBy;
        storage.updateSetting('sortBy', sortBy);
        this.updateUI();
    }
    
    // Render tasks in the UI
    renderTasks() {
        const taskList = document.getElementById('taskList');
        const emptyState = document.getElementById('emptyState');
        const tasks = this.getFilteredTasks();
        
        if (tasks.length === 0) {
            taskList.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }
        
        taskList.style.display = 'block';
        emptyState.style.display = 'none';
        
        taskList.innerHTML = tasks.map(task => this.renderTaskItem(task)).join('');
        
        // Add event listeners
        this.attachTaskEventListeners();
        
        // Initialize drag and drop
        this.initializeDragAndDrop();
    }
    
    // Render a single task item
    renderTaskItem(task) {
        const project = task.projectId ? storage.getProject(task.projectId) : null;
        const dueDateText = task.dueDate ? Utils.formatDate(task.dueDate) : '';
        const dueTimeText = task.dueDate ? Utils.formatTime(task.dueDate) : '';
        
        let dueDateClass = '';
        if (task.dueDate && !task.completed) {
            if (Utils.isOverdue(task.dueDate)) dueDateClass = 'overdue';
            else if (Utils.isToday(task.dueDate)) dueDateClass = 'today';
        }
        
        return `
            <div class="task-item ${task.completed ? 'completed' : ''}" 
                 data-task-id="${task.id}" 
                 draggable="true">
                <div class="task-main">
                    <div class="task-priority ${task.priority}"></div>
                    <div class="task-checkbox ${task.completed ? 'completed' : ''}" 
                         data-action="toggle"></div>
                    <div class="task-content">
                        <div class="task-title">${Utils.escapeHtml(task.title)}</div>
                        ${task.description ? 
                            `<div class="task-description">${Utils.escapeHtml(task.description)}</div>` : ''
                        }
                        <div class="task-meta">
                            ${task.dueDate ? 
                                `<span class="task-due ${dueDateClass}">
                                    📅 ${dueDateText}${dueTimeText ? ` at ${dueTimeText}` : ''}
                                </span>` : ''
                            }
                            ${project ? 
                                `<span class="task-project">${Utils.escapeHtml(project.name)}</span>` : ''
                            }
                            ${task.tags && task.tags.length > 0 ? 
                                `<div class="task-tags">
                                    ${task.tags.map(tag => 
                                        `<span class="task-tag">${Utils.escapeHtml(tag)}</span>`
                                    ).join('')}
                                </div>` : ''
                            }
                        </div>
                    </div>
                    <div class="task-actions">
                        <button class="task-action" data-action="edit" title="Edit task">✏️</button>
                        <button class="task-action" data-action="delete" title="Delete task">🗑️</button>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Attach event listeners to task items
    attachTaskEventListeners() {
        const taskItems = document.querySelectorAll('.task-item');
        
        taskItems.forEach(item => {
            const taskId = item.dataset.taskId;
            
            // Toggle completion
            const checkbox = item.querySelector('[data-action="toggle"]');
            checkbox?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleTaskComplete(taskId);
            });
            
            // Edit task
            const editBtn = item.querySelector('[data-action="edit"]');
            editBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleTaskEdit(taskId);
            });
            
            // Delete task
            const deleteBtn = item.querySelector('[data-action="delete"]');
            deleteBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleTaskDelete(taskId);
            });
            
            // Click to edit
            item.addEventListener('click', () => {
                this.handleTaskEdit(taskId);
            });
        });
    }
    
    // Initialize drag and drop functionality
    initializeDragAndDrop() {
        const taskItems = document.querySelectorAll('.task-item');
        
        taskItems.forEach(item => {
            item.addEventListener('dragstart', this.handleDragStart.bind(this));
            item.addEventListener('dragover', this.handleDragOver.bind(this));
            item.addEventListener('drop', this.handleDrop.bind(this));
            item.addEventListener('dragend', this.handleDragEnd.bind(this));
        });
    }
    
    // Drag and drop handlers
    handleDragStart(e) {
        e.dataTransfer.setData('text/plain', e.target.dataset.taskId);
        e.target.classList.add('dragging');
    }
    
    handleDragOver(e) {
        e.preventDefault();
    }
    
    handleDrop(e) {
        e.preventDefault();
        const draggedTaskId = e.dataTransfer.getData('text/plain');
        const targetTaskId = e.target.closest('.task-item')?.dataset.taskId;
        
        if (draggedTaskId && targetTaskId && draggedTaskId !== targetTaskId) {
            this.reorderTasks(draggedTaskId, targetTaskId);
        }
    }
    
    handleDragEnd(e) {
        e.target.classList.remove('dragging');
    }
    
    // Reorder tasks (simplified - just update timestamps)
    reorderTasks(draggedTaskId, targetTaskId) {
        const tasks = storage.getTasks();
        const draggedTask = tasks.find(t => t.id === draggedTaskId);
        const targetTask = tasks.find(t => t.id === targetTaskId);
        
        if (draggedTask && targetTask) {
            // Simple reordering by updating the dragged task's timestamp
            storage.updateTask(draggedTaskId, { 
                updatedAt: new Date().toISOString() 
            });
            
            this.updateUI();
            Utils.showToast('Task reordered successfully!', 'success');
        }
    }
    
    // Event handlers
    handleTaskComplete(taskId) {
        this.toggleTaskCompletion(taskId);
    }
    
    handleTaskEdit(taskId) {
        ui.openTaskModal(taskId);
    }
    
    handleTaskDelete(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
            this.deleteTask(taskId);
        }
    }
    
    // Update view title
    updateViewTitle() {
        const viewTitle = document.getElementById('viewTitle');
        
        switch (this.currentView) {
            case 'today':
                viewTitle.textContent = 'Today';
                break;
            case 'upcoming':
                viewTitle.textContent = 'Upcoming';
                break;
            case 'completed':
                viewTitle.textContent = 'Completed';
                break;
            case 'project':
                const project = storage.getProject(this.currentFilters.project);
                viewTitle.textContent = project ? project.name : 'Project';
                break;
            default:
                viewTitle.textContent = 'Tasks';
        }
    }
    
    // Update navigation counts
    updateNavigation() {
        const allTasks = storage.getTasks();
        const stats = Utils.calculateStats(allTasks);
        
        // Update view counts - use todayView for accurate count
        document.getElementById('todayCount').textContent = stats.todayView;
        document.getElementById('upcomingCount').textContent = stats.upcoming;
        document.getElementById('completedCount').textContent = stats.completed;
        
        // Update active navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeView = this.currentView === 'project' ? 
            `project-${this.currentFilters.project}` : this.currentView;
        const activeNavItem = document.querySelector(`[data-view="${activeView}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }
    }
    
    // Update entire UI
    updateUI() {
        this.renderTasks();
        this.updateNavigation();
        projectManager.updateProjectsList();
        this.updateTagsList();
    }
    
    // Update tags list in sidebar
    updateTagsList() {
        const tagsContainer = document.getElementById('tagsContainer');
        const allTags = storage.getAllTags();
        
        tagsContainer.innerHTML = allTags.slice(0, 10).map(tag => 
            `<span class="tag" data-tag="${Utils.escapeHtml(tag)}">${Utils.escapeHtml(tag)}</span>`
        ).join('');
        
        // Add click handlers for tags
        tagsContainer.querySelectorAll('.tag').forEach(tagElement => {
            tagElement.addEventListener('click', () => {
                const tag = tagElement.dataset.tag;
                this.updateFilters({ tags: [tag] });
                Utils.showToast(`Filtering by tag: ${tag}`, 'info');
            });
        });
    }
    
    // Search tasks
    searchTasks(query) {
        this.updateFilters({ search: query });
    }
    
    // Get task statistics
    getStats() {
        const tasks = storage.getTasks();
        return Utils.calculateStats(tasks);
    }
}

// Create and export task manager instance
window.taskManager = new TaskManager();
