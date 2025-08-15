// Utility functions for the todo app

// Generate unique IDs
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Format dates
function formatDate(date) {
    if (!date) return '';
    
    const now = new Date();
    const targetDate = new Date(date);
    const diffTime = targetDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
        return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`;
    } else if (diffDays === 0) {
        return 'Today';
    } else if (diffDays === 1) {
        return 'Tomorrow';
    } else if (diffDays <= 7) {
        return `In ${diffDays} days`;
    } else {
        return targetDate.toLocaleDateString();
    }
}

// Format time
function formatTime(date) {
    if (!date) return '';
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Check if date is today
function isToday(date) {
    if (!date) return false;
    const today = new Date();
    const targetDate = new Date(date);
    return targetDate.toDateString() === today.toDateString();
}

// Check if date is overdue
function isOverdue(date) {
    if (!date) return false;
    const now = new Date();
    const targetDate = new Date(date);
    return targetDate < now;
}

// Check if date is upcoming (within next 7 days)
function isUpcoming(date) {
    if (!date) return false;
    const now = new Date();
    const targetDate = new Date(date);
    const diffTime = targetDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Debounce function for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function for performance
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Deep clone object
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// Get priority color
function getPriorityColor(priority) {
    switch (priority) {
        case 'high': return 'var(--priority-high)';
        case 'medium': return 'var(--priority-medium)';
        case 'low': return 'var(--priority-low)';
        default: return 'var(--priority-low)';
    }
}

// Get priority text
function getPriorityText(priority) {
    switch (priority) {
        case 'high': return 'High Priority';
        case 'medium': return 'Medium Priority';
        case 'low': return 'Low Priority';
        default: return 'No Priority';
    }
}

// Animate element
function animateElement(element, animationClass, duration = 300) {
    return new Promise((resolve) => {
        element.classList.add(animationClass);
        setTimeout(() => {
            element.classList.remove(animationClass);
            resolve();
        }, duration);
    });
}

// Show notification toast
function showToast(message, type = 'info', duration = 3000) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = 'flex';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, duration);
}

// Validate email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Get relative time
function getRelativeTime(date) {
    if (!date) return '';
    
    const now = new Date();
    const targetDate = new Date(date);
    const diffMs = now.getTime() - targetDate.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) {
        return 'Just now';
    } else if (diffMinutes < 60) {
        return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
        return targetDate.toLocaleDateString();
    }
}

// Sort tasks by various criteria
function sortTasks(tasks, sortBy = 'priority') {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    
    return tasks.sort((a, b) => {
        switch (sortBy) {
            case 'priority':
                return priorityOrder[b.priority] - priorityOrder[a.priority];
            case 'dueDate':
                if (!a.dueDate && !b.dueDate) return 0;
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(a.dueDate) - new Date(b.dueDate);
            case 'created':
                return new Date(b.createdAt) - new Date(a.createdAt);
            case 'alphabetical':
                return a.title.localeCompare(b.title);
            case 'completed':
                return a.completed === b.completed ? 0 : a.completed ? 1 : -1;
            default:
                return 0;
        }
    });
}

// Filter tasks based on criteria
function filterTasks(tasks, filters) {
    return tasks.filter(task => {
        // Search filter
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            const matchesTitle = task.title.toLowerCase().includes(searchTerm);
            const matchesDescription = task.description?.toLowerCase().includes(searchTerm);
            const matchesTags = task.tags?.some(tag => tag.toLowerCase().includes(searchTerm));
            if (!matchesTitle && !matchesDescription && !matchesTags) {
                return false;
            }
        }
        
        // Priority filter
        if (filters.priority && filters.priority.length > 0) {
            if (!filters.priority.includes(task.priority)) {
                return false;
            }
        }
        
        // Project filter
        if (filters.project) {
            if (task.projectId !== filters.project) {
                return false;
            }
        }
        
        // Date filters
        if (filters.overdue && !isOverdue(task.dueDate)) {
            return false;
        }
        
        if (filters.today && !isToday(task.dueDate)) {
            return false;
        }
        
        // Completion filter
        if (filters.completed !== undefined) {
            if (task.completed !== filters.completed) {
                return false;
            }
        }
        
        // Tag filter
        if (filters.tags && filters.tags.length > 0) {
            if (!task.tags || !filters.tags.some(tag => task.tags.includes(tag))) {
                return false;
            }
        }
        
        return true;
    });
}

// Calculate task statistics
function calculateStats(tasks) {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const overdue = tasks.filter(task => !task.completed && isOverdue(task.dueDate)).length;
    const today = tasks.filter(task => !task.completed && isToday(task.dueDate)).length;
    const upcoming = tasks.filter(task => !task.completed && isUpcoming(task.dueDate)).length;
    
    // Count tasks that appear in "Today" view (includes no due date tasks)
    const todayView = tasks.filter(task => 
        !task.completed && (
            isToday(task.dueDate) || 
            isOverdue(task.dueDate) ||
            !task.dueDate
        )
    ).length;
    
    return {
        total,
        completed,
        overdue,
        today,
        todayView, // New field for accurate Today view count
        upcoming,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
}

// Local storage helpers
function safeJsonParse(str, defaultValue = null) {
    try {
        return JSON.parse(str);
    } catch (e) {
        console.warn('Failed to parse JSON:', e);
        return defaultValue;
    }
}

function safeJsonStringify(obj, defaultValue = '{}') {
    try {
        return JSON.stringify(obj);
    } catch (e) {
        console.warn('Failed to stringify JSON:', e);
        return defaultValue;
    }
}

// Export functions for use in other modules
window.Utils = {
    generateId,
    formatDate,
    formatTime,
    isToday,
    isOverdue,
    isUpcoming,
    escapeHtml,
    debounce,
    throttle,
    deepClone,
    getPriorityColor,
    getPriorityText,
    animateElement,
    showToast,
    isValidEmail,
    getRelativeTime,
    sortTasks,
    filterTasks,
    calculateStats,
    safeJsonParse,
    safeJsonStringify
};
