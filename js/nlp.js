// Natural Language Processing for task input parsing

class NLPProcessor {
    constructor() {
        // Date keywords and patterns
        this.dateKeywords = {
            today: () => new Date(),
            tomorrow: () => {
                const date = new Date();
                date.setDate(date.getDate() + 1);
                return date;
            },
            yesterday: () => {
                const date = new Date();
                date.setDate(date.getDate() - 1);
                return date;
            },
            'next week': () => {
                const date = new Date();
                date.setDate(date.getDate() + 7);
                return date;
            },
            'next monday': () => this.getNextWeekday(1),
            'next tuesday': () => this.getNextWeekday(2),
            'next wednesday': () => this.getNextWeekday(3),
            'next thursday': () => this.getNextWeekday(4),
            'next friday': () => this.getNextWeekday(5),
            'next saturday': () => this.getNextWeekday(6),
            'next sunday': () => this.getNextWeekday(0),
            monday: () => this.getThisWeekday(1),
            tuesday: () => this.getThisWeekday(2),
            wednesday: () => this.getThisWeekday(3),
            thursday: () => this.getThisWeekday(4),
            friday: () => this.getThisWeekday(5),
            saturday: () => this.getThisWeekday(6),
            sunday: () => this.getThisWeekday(0)
        };
        
        // Time patterns
        this.timePatterns = [
            /(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)/,
            /(\d{1,2})\s*(am|pm|AM|PM)/,
            /(\d{1,2}):(\d{2})/,
            /at\s*(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/
        ];
        
        // Priority keywords
        this.priorityKeywords = {
            urgent: 'high',
            important: 'high',
            critical: 'high',
            high: 'high',
            asap: 'high',
            medium: 'medium',
            normal: 'medium',
            low: 'low',
            minor: 'low'
        };
        
        // Common tag patterns
        this.tagPatterns = [
            /#(\w+)/g,  // #hashtag
            /@(\w+)/g   // @mention style
        ];
        
        // Project keywords
        this.projectKeywords = {
            work: 'work',
            job: 'work',
            office: 'work',
            meeting: 'work',
            project: 'work',
            personal: 'personal',
            home: 'personal',
            family: 'personal',
            self: 'personal'
        };
    }
    
    // Parse natural language input into task object
    parseTaskInput(input) {
        const parsed = {
            title: input.trim(),
            dueDate: null,
            priority: 'medium',
            tags: [],
            projectId: '',
            suggestions: {
                dueDate: null,
                priority: null,
                tags: [],
                projectId: null
            }
        };
        
        let processedInput = input.toLowerCase().trim();
        
        // Extract and process date/time
        const dateTimeResult = this.extractDateTime(processedInput);
        if (dateTimeResult.date) {
            parsed.suggestions.dueDate = dateTimeResult.date;
            parsed.dueDate = dateTimeResult.date;
            processedInput = dateTimeResult.remainingText;
        }
        
        // Extract priority
        const priorityResult = this.extractPriority(processedInput);
        if (priorityResult.priority) {
            parsed.suggestions.priority = priorityResult.priority;
            parsed.priority = priorityResult.priority;
            processedInput = priorityResult.remainingText;
        }
        
        // Extract tags
        const tagsResult = this.extractTags(input); // Use original input for tags
        if (tagsResult.tags.length > 0) {
            parsed.suggestions.tags = tagsResult.tags;
            parsed.tags = tagsResult.tags;
        }
        
        // Extract project suggestion
        const projectResult = this.extractProject(processedInput);
        if (projectResult.projectId) {
            parsed.suggestions.projectId = projectResult.projectId;
            parsed.projectId = projectResult.projectId;
            processedInput = projectResult.remainingText;
        }
        
        // Clean up the title
        parsed.title = this.cleanTitle(processedInput);
        
        return parsed;
    }
    
    // Extract date and time from text
    extractDateTime(text) {
        let remainingText = text;
        let extractedDate = null;
        
        // Check for relative date keywords
        for (const [keyword, dateFunc] of Object.entries(this.dateKeywords)) {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            if (regex.test(text)) {
                extractedDate = dateFunc();
                remainingText = remainingText.replace(regex, '').trim();
                break;
            }
        }
        
        // Check for specific date patterns (MM/DD, MM-DD, MM.DD)
        const datePatterns = [
            /(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{2,4}))?/,
            /(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
            /(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})/i
        ];
        
        for (const pattern of datePatterns) {
            const match = text.match(pattern);
            if (match) {
                extractedDate = this.parseDateMatch(match);
                remainingText = remainingText.replace(pattern, '').trim();
                break;
            }
        }
        
        // Extract time if date was found
        if (extractedDate) {
            const timeResult = this.extractTime(remainingText);
            if (timeResult.time) {
                extractedDate = this.combineDateTime(extractedDate, timeResult.time);
                remainingText = timeResult.remainingText;
            }
        }
        
        return {
            date: extractedDate,
            remainingText: remainingText.replace(/\s+/g, ' ').trim()
        };
    }
    
    // Extract time from text
    extractTime(text) {
        let remainingText = text;
        let extractedTime = null;
        
        for (const pattern of this.timePatterns) {
            const match = text.match(pattern);
            if (match) {
                extractedTime = this.parseTimeMatch(match);
                remainingText = remainingText.replace(pattern, '').trim();
                break;
            }
        }
        
        return {
            time: extractedTime,
            remainingText: remainingText
        };
    }
    
    // Extract priority from text
    extractPriority(text) {
        let remainingText = text;
        let extractedPriority = null;
        
        for (const [keyword, priority] of Object.entries(this.priorityKeywords)) {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            if (regex.test(text)) {
                extractedPriority = priority;
                remainingText = remainingText.replace(regex, '').trim();
                break;
            }
        }
        
        return {
            priority: extractedPriority,
            remainingText: remainingText
        };
    }
    
    // Extract tags from text
    extractTags(text) {
        const tags = [];
        
        for (const pattern of this.tagPatterns) {
            const matches = [...text.matchAll(pattern)];
            matches.forEach(match => {
                if (match[1] && !tags.includes(match[1])) {
                    tags.push(match[1]);
                }
            });
        }
        
        return { tags };
    }
    
    // Extract project suggestion from text
    extractProject(text) {
        let remainingText = text;
        let extractedProjectId = null;
        
        for (const [keyword, projectId] of Object.entries(this.projectKeywords)) {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            if (regex.test(text)) {
                extractedProjectId = projectId;
                remainingText = remainingText.replace(regex, '').trim();
                break;
            }
        }
        
        return {
            projectId: extractedProjectId,
            remainingText: remainingText
        };
    }
    
    // Helper methods
    getNextWeekday(targetDay) {
        const date = new Date();
        const currentDay = date.getDay();
        const daysUntilNext = (targetDay + 7 - currentDay) % 7 || 7;
        date.setDate(date.getDate() + daysUntilNext);
        return date;
    }
    
    getThisWeekday(targetDay) {
        const date = new Date();
        const currentDay = date.getDay();
        const daysUntilTarget = targetDay - currentDay;
        
        if (daysUntilTarget <= 0) {
            // If the day has passed this week, get next week's
            date.setDate(date.getDate() + (daysUntilTarget + 7));
        } else {
            date.setDate(date.getDate() + daysUntilTarget);
        }
        
        return date;
    }
    
    parseDateMatch(match) {
        const now = new Date();
        
        if (match[0].includes('/') || match[0].includes('-') || match[0].includes('.')) {
            // MM/DD or MM/DD/YYYY format
            const month = parseInt(match[1]) - 1; // Month is 0-indexed
            const day = parseInt(match[2]);
            const year = match[3] ? parseInt(match[3]) : now.getFullYear();
            
            return new Date(year < 100 ? 2000 + year : year, month, day);
        } else {
            // Month name format
            const monthNames = {
                jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
                apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
                aug: 7, august: 7, sep: 8, september: 8, oct: 9, october: 9,
                nov: 10, november: 10, dec: 11, december: 11
            };
            
            let month, day;
            if (match[2] && !isNaN(match[2])) {
                // "15 January" format
                day = parseInt(match[1]);
                month = monthNames[match[2].toLowerCase()];
            } else {
                // "January 15" format
                month = monthNames[match[1].toLowerCase()];
                day = parseInt(match[2]);
            }
            
            const date = new Date(now.getFullYear(), month, day);
            
            // If the date has passed this year, set it for next year
            if (date < now) {
                date.setFullYear(now.getFullYear() + 1);
            }
            
            return date;
        }
    }
    
    parseTimeMatch(match) {
        let hours = parseInt(match[1]);
        let minutes = match[2] ? parseInt(match[2]) : 0;
        const period = match[3]?.toLowerCase();
        
        if (period === 'pm' && hours !== 12) {
            hours += 12;
        } else if (period === 'am' && hours === 12) {
            hours = 0;
        }
        
        return { hours, minutes };
    }
    
    combineDateTime(date, time) {
        const combined = new Date(date);
        combined.setHours(time.hours, time.minutes, 0, 0);
        return combined;
    }
    
    cleanTitle(text) {
        return text
            .replace(/\s+/g, ' ')  // Multiple spaces to single space
            .replace(/^\s*[\-\•\*]\s*/, '')  // Remove leading bullet points
            .replace(/\s*[\-\•\*]\s*$/, '')  // Remove trailing bullet points
            .trim()
            .replace(/^./, str => str.toUpperCase()); // Capitalize first letter
    }
    
    // Generate smart suggestions based on existing tasks
    generateSuggestions(input, existingTasks = []) {
        const suggestions = {
            titles: [],
            tags: [],
            projects: []
        };
        
        const inputLower = input.toLowerCase();
        
        // Suggest similar titles
        existingTasks.forEach(task => {
            if (task.title.toLowerCase().includes(inputLower) || 
                inputLower.includes(task.title.toLowerCase().slice(0, 3))) {
                if (!suggestions.titles.includes(task.title)) {
                    suggestions.titles.push(task.title);
                }
            }
        });
        
        // Suggest popular tags
        const tagCounts = {};
        existingTasks.forEach(task => {
            if (task.tags) {
                task.tags.forEach(tag => {
                    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                });
            }
        });
        
        suggestions.tags = Object.entries(tagCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([tag]) => tag);
        
        return suggestions;
    }
    
    // Parse recurring task patterns
    parseRecurring(text) {
        const recurringPatterns = {
            daily: /\b(daily|every day|each day)\b/i,
            weekly: /\b(weekly|every week|each week)\b/i,
            monthly: /\b(monthly|every month|each month)\b/i,
            yearly: /\b(yearly|annually|every year|each year)\b/i
        };
        
        for (const [pattern, regex] of Object.entries(recurringPatterns)) {
            if (regex.test(text)) {
                return pattern;
            }
        }
        
        return null;
    }
}

// Create and export NLP processor instance
window.nlp = new NLPProcessor();
