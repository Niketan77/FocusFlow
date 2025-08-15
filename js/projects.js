// Project management functions

class ProjectManager {
    constructor() {
        this.currentProject = null;
    }
    
    // Get all projects
    getProjects() {
        return storage.getProjects();
    }
    
    // Create a new project
    createProject(projectData) {
        const project = storage.addProject(projectData);
        this.updateProjectsList();
        Utils.showToast('Project created successfully!', 'success');
        return project;
    }
    
    // Update an existing project
    updateProject(projectId, updates) {
        const project = storage.updateProject(projectId, updates);
        if (project) {
            this.updateProjectsList();
            Utils.showToast('Project updated successfully!', 'success');
        }
        return project;
    }
    
    // Delete a project
    deleteProject(projectId) {
        // Confirm deletion
        const project = storage.getProject(projectId);
        if (!project) return false;
        
        const taskCount = storage.getTasks().filter(task => task.projectId === projectId).length;
        let confirmMessage = `Are you sure you want to delete "${project.name}"?`;
        
        if (taskCount > 0) {
            confirmMessage += `\n\nThis will remove the project from ${taskCount} task${taskCount !== 1 ? 's' : ''}.`;
        }
        
        if (!confirm(confirmMessage)) {
            return false;
        }
        
        const success = storage.deleteProject(projectId);
        if (success) {
            this.updateProjectsList();
            // If we're currently viewing this project, switch to today view
            if (taskManager.currentView === 'project' && 
                taskManager.currentFilters.project === projectId) {
                taskManager.setView('today');
            }
            Utils.showToast('Project deleted successfully!', 'success');
        }
        return success;
    }
    
    // Get project by ID
    getProject(projectId) {
        return storage.getProject(projectId);
    }
    
    // Update projects list in sidebar
    updateProjectsList() {
        const projectsList = document.getElementById('projectsList');
        const projects = this.getProjects();
        
        projectsList.innerHTML = projects.map(project => {
            const taskCount = storage.getTasks().filter(task => 
                task.projectId === project.id && !task.completed
            ).length;
            
            return `
                <li>
                    <button class="nav-item" data-view="project-${project.id}">
                        <span class="icon" style="color: ${project.color}">📁</span>
                        ${Utils.escapeHtml(project.name)}
                        <span class="count">${taskCount}</span>
                        <div class="project-actions" style="display: none;">
                            <button class="btn btn-icon project-edit" data-project-id="${project.id}" title="Edit project">✏️</button>
                            ${project.id !== 'personal' && project.id !== 'work' ? 
                                `<button class="btn btn-icon project-delete" data-project-id="${project.id}" title="Delete project">🗑️</button>` : ''
                            }
                        </div>
                    </button>
                </li>
            `;
        }).join('');
        
        // Add event listeners
        this.attachProjectEventListeners();
        
        // Update project selects in forms
        this.updateProjectSelects();
    }
    
    // Attach event listeners to project items
    attachProjectEventListeners() {
        const projectItems = document.querySelectorAll('#projectsList .nav-item');
        
        projectItems.forEach(item => {
            const viewData = item.dataset.view;
            if (viewData.startsWith('project-')) {
                const projectId = viewData.replace('project-', '');
                
                // Project selection
                item.addEventListener('click', (e) => {
                    if (!e.target.closest('.project-actions')) {
                        taskManager.setProjectView(projectId);
                    }
                });
                
                // Show actions on hover
                item.addEventListener('mouseenter', () => {
                    const actions = item.querySelector('.project-actions');
                    if (actions) actions.style.display = 'flex';
                });
                
                item.addEventListener('mouseleave', () => {
                    const actions = item.querySelector('.project-actions');
                    if (actions) actions.style.display = 'none';
                });
                
                // Edit project
                const editBtn = item.querySelector('.project-edit');
                if (editBtn) {
                    editBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.openProjectModal(projectId);
                    });
                }
                
                // Delete project
                const deleteBtn = item.querySelector('.project-delete');
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.deleteProject(projectId);
                    });
                }
            }
        });
    }
    
    // Update project select dropdowns
    updateProjectSelects() {
        const projects = this.getProjects();
        const selects = document.querySelectorAll('#taskProject, #editTaskProject');
        
        selects.forEach(select => {
            const currentValue = select.value;
            select.innerHTML = '<option value="">No Project</option>' +
                projects.map(project => 
                    `<option value="${project.id}">${Utils.escapeHtml(project.name)}</option>`
                ).join('');
            
            // Restore previous value if it still exists
            if (currentValue && projects.find(p => p.id === currentValue)) {
                select.value = currentValue;
            }
        });
    }
    
    // Open project modal for creating/editing
    openProjectModal(projectId = null) {
        const isEdit = projectId !== null;
        const project = isEdit ? this.getProject(projectId) : null;
        
        // Create modal HTML
        const modalHTML = `
            <div class="modal-overlay" id="projectModalOverlay">
                <div class="modal" id="projectModal">
                    <div class="modal-header">
                        <h3>${isEdit ? 'Edit Project' : 'New Project'}</h3>
                        <button class="btn btn-icon" id="closeProjectModal">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Project Name</label>
                            <input type="text" id="projectName" class="form-input" 
                                   value="${project ? Utils.escapeHtml(project.name) : ''}"
                                   placeholder="Enter project name">
                        </div>
                        <div class="form-group">
                            <label>Description</label>
                            <textarea id="projectDescription" class="form-input" rows="3"
                                      placeholder="Project description (optional)">${project ? Utils.escapeHtml(project.description || '') : ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Color</label>
                            <div class="color-picker">
                                <input type="color" id="projectColor" class="form-input" 
                                       value="${project ? project.color : '#3b82f6'}">
                                <div class="color-presets">
                                    <button type="button" class="color-preset" data-color="#3b82f6" style="background: #3b82f6"></button>
                                    <button type="button" class="color-preset" data-color="#10b981" style="background: #10b981"></button>
                                    <button type="button" class="color-preset" data-color="#f59e0b" style="background: #f59e0b"></button>
                                    <button type="button" class="color-preset" data-color="#ef4444" style="background: #ef4444"></button>
                                    <button type="button" class="color-preset" data-color="#8b5cf6" style="background: #8b5cf6"></button>
                                    <button type="button" class="color-preset" data-color="#06b6d4" style="background: #06b6d4"></button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="cancelProjectEdit">Cancel</button>
                        ${isEdit && project.id !== 'personal' && project.id !== 'work' ? 
                            '<button class="btn btn-danger" id="deleteProjectBtn">Delete</button>' : ''
                        }
                        <button class="btn btn-primary" id="saveProject">${isEdit ? 'Save' : 'Create'}</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Add event listeners
        this.attachProjectModalListeners(projectId);
        
        // Show modal
        document.getElementById('projectModalOverlay').style.display = 'flex';
        document.getElementById('projectName').focus();
    }
    
    // Attach event listeners to project modal
    attachProjectModalListeners(projectId) {
        const modal = document.getElementById('projectModalOverlay');
        const closeBtn = document.getElementById('closeProjectModal');
        const cancelBtn = document.getElementById('cancelProjectEdit');
        const saveBtn = document.getElementById('saveProject');
        const deleteBtn = document.getElementById('deleteProjectBtn');
        const colorInput = document.getElementById('projectColor');
        const colorPresets = document.querySelectorAll('.color-preset');
        
        // Close modal
        const closeModal = () => {
            modal.remove();
        };
        
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        
        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        // Color presets
        colorPresets.forEach(preset => {
            preset.addEventListener('click', () => {
                colorInput.value = preset.dataset.color;
            });
        });
        
        // Save project
        saveBtn.addEventListener('click', () => {
            const name = document.getElementById('projectName').value.trim();
            const description = document.getElementById('projectDescription').value.trim();
            const color = document.getElementById('projectColor').value;
            
            if (!name) {
                Utils.showToast('Please enter a project name', 'error');
                return;
            }
            
            const projectData = { name, description, color };
            
            if (projectId) {
                this.updateProject(projectId, projectData);
            } else {
                this.createProject(projectData);
            }
            
            closeModal();
        });
        
        // Delete project
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                if (this.deleteProject(projectId)) {
                    closeModal();
                }
            });
        }
        
        // Enter key to save
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                saveBtn.click();
            }
        });
    }
    
    // Get project statistics
    getProjectStats(projectId) {
        const tasks = storage.getTasks().filter(task => task.projectId === projectId);
        return Utils.calculateStats(tasks);
    }
    
    // Get all project statistics
    getAllProjectStats() {
        const projects = this.getProjects();
        return projects.map(project => ({
            ...project,
            stats: this.getProjectStats(project.id)
        }));
    }
    
    // Export project data
    exportProject(projectId) {
        const project = this.getProject(projectId);
        if (!project) return null;
        
        const tasks = storage.getTasks().filter(task => task.projectId === projectId);
        
        return {
            project,
            tasks,
            exportedAt: new Date().toISOString()
        };
    }
    
    // Import project data
    importProject(projectData) {
        try {
            if (projectData.project) {
                // Create new project with unique ID
                const newProject = this.createProject({
                    name: projectData.project.name + ' (Imported)',
                    description: projectData.project.description,
                    color: projectData.project.color
                });
                
                // Import tasks
                if (projectData.tasks && newProject) {
                    projectData.tasks.forEach(taskData => {
                        const newTaskData = {
                            ...taskData,
                            projectId: newProject.id
                        };
                        delete newTaskData.id;
                        delete newTaskData.createdAt;
                        delete newTaskData.updatedAt;
                        delete newTaskData.completedAt;
                        
                        storage.addTask(newTaskData);
                    });
                }
                
                this.updateProjectsList();
                taskManager.updateUI();
                Utils.showToast('Project imported successfully!', 'success');
                
                return newProject;
            }
        } catch (error) {
            console.error('Failed to import project:', error);
            Utils.showToast('Failed to import project', 'error');
        }
        
        return null;
    }
}

// Create and export project manager instance
window.projectManager = new ProjectManager();
