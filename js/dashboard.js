class Dashboard {
    constructor() {
        this.currentUser = null;
        this.currentDate = new Date();
        this.fastingData = [];
        this.recentActivities = [];
        this.activeFasts = [];
        this.upcomingFasts = [];
        this.completedFasts = [];
        this.filters = {
            year: 'all',
            month: 'all',
            fastType: 'all'
        };
    }

    async init() {
        await this.loadUserData();
        this.bindEvents();
        await this.loadDashboardData();
        this.initializeCalendar();
        this.updateFilterValues();
        this.updateUI();
        this.populateYearFilter();
    }

	
	populateYearFilter() {
        const yearFilter = document.getElementById('yearFilter');
        if (!yearFilter) return;

        // Clear existing options
        yearFilter.innerHTML = '';
        
        // Add 'All Years' option
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'All Years';
        yearFilter.appendChild(allOption);

        // Add current year and previous 5 years
        const currentYear = new Date().getFullYear();
        for (let i = currentYear; i >= currentYear - 5; i--) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            yearFilter.appendChild(option);
        }

        // Set default value
        yearFilter.value = this.filters.year;
    }
	
	populateFastTypeFilter(fastPlanNames) {
        const fastTypeFilter = document.getElementById('fastTypeFilter');
        if (!fastTypeFilter) return;

        // Clear existing options except the first one
        fastTypeFilter.innerHTML = '<option value="all">All Fast Types</option>';
        
        // Add plan names from database
        fastPlanNames.forEach(planName => {
            const option = document.createElement('option');
            option.value = planName;
            option.textContent = planName;
            fastTypeFilter.appendChild(option);
        });

        // Set default value
        fastTypeFilter.value = this.filters.fastType;
    }

    async loadUserData() {
        this.currentUser = AuthHelper.getUser();
        console.log('User loaded:', this.currentUser);
    }
	
	bindEvents() {
        console.log('Binding dashboard events...');
        
        // Date filters
        const yearFilter = document.getElementById('yearFilter');
        const monthFilter = document.getElementById('monthFilter');
        const fastTypeFilter = document.getElementById('fastTypeFilter');
        
        if (yearFilter) {
            yearFilter.addEventListener('change', (e) => {
                this.filters.year = e.target.value;
                this.applyFilters();
            });
        }
        
        if (monthFilter) {
            monthFilter.addEventListener('change', (e) => {
                this.filters.month = e.target.value;
                this.applyFilters();
            });
        }
        
        if (fastTypeFilter) {
            fastTypeFilter.addEventListener('change', (e) => {
                this.filters.fastType = e.target.value;
                this.applyFilters();
            });
        }

        // Calendar controls
        const prevMonth = document.getElementById('prevMonth');
        const nextMonth = document.getElementById('nextMonth');
        
        if (prevMonth) {
            prevMonth.addEventListener('click', () => this.previousMonth());
        }
        
        if (nextMonth) {
            nextMonth.addEventListener('click', () => this.nextMonth());
        }

        // Quick actions
        document.querySelectorAll('.quick-action').forEach(action => {
            action.addEventListener('click', (e) => {
                const actionType = e.currentTarget.getAttribute('data-action');
                this.handleQuickAction(actionType);
            });
        });
    }

    applyFilters() {
        console.log('Applying filters:', this.filters);
        this.loadDashboardData();
    }

    updateUI() {
        // Update welcome message
        const welcomeName = document.getElementById('welcomeName');
        if (welcomeName && this.currentUser) {
            welcomeName.textContent = this.currentUser.name;
        }

        // Update user info in header
        const userAvatar = document.getElementById('userAvatar');
        const userName = document.getElementById('userName');
        
        if (userAvatar && this.currentUser) {
            userAvatar.textContent = this.currentUser.name.charAt(0).toUpperCase();
        }
        if (userName && this.currentUser) {
            userName.textContent = this.currentUser.name;
        }
    }

    async loadDashboardData() {
        console.log('Loading dashboard data for user:', this.currentUser?.id);
        try {
            const params = {
                calendarYear: this.currentDate.getFullYear(),
                calendarMonth: this.currentDate.getMonth() + 1
            };
            
            // Only add filters if they're not 'all'
            if (this.filters.year !== 'all') {
                params.year = this.filters.year;
            }
            if (this.filters.month !== 'all') {
                params.month = this.filters.month;
            }
            if (this.filters.fastType !== 'all') {
                params.fastType = this.filters.fastType;
            }
            
            console.log('Sending params:', params);
            
            const response = await AuthHelper.apiCall('dashboard/data.php', 'POST', params);
            if (response.success) {
                this.updateDashboardWithData(response.data);
            } else {
                console.error('Dashboard data error:', response.message);
                this.showNotification('Error loading dashboard data: ' + response.message, 'error');
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showNotification('Error loading dashboard data', 'error');
        }
    }

    updateDashboardWithData(data) {
        console.log('Updating dashboard with data:', data);
        
        // Update main statistics
        this.updateElementText('totalFasts', data.totalFasts || 0);
        this.updateElementText('totalHours', data.totalHours || 0);
        this.updateElementText('prayersCount', data.prayersCount || 0);
        this.updateElementText('journalEntries', data.journalEntries || 0);

        // Update fasting statistics
        this.updateElementText('activeFastsCount', data.activeFastsCount || 0);
        this.updateElementText('completedFastsCount', data.completedFastsCount || 0);
        this.updateElementText('totalFastsCount', data.totalFastsCount || 0);
        this.updateElementText('upcomingFastsCount', data.upcomingFastsCount || 0);

        // Update changes
        this.updateElementText('fastsChange', 
            `${data.fastsChange >= 0 ? '+' : ''}${data.fastsChange}% this month`);
        this.updateElementText('hoursChange', 
            `${data.hoursChange >= 0 ? '+' : ''}${data.hoursChange}% this month`);
        this.updateElementText('prayersChange', 
            `${data.prayersChange >= 0 ? '+' : ''}${data.prayersChange}% this month`);
        this.updateElementText('journalChange', 
            `${data.journalChange >= 0 ? '+' : ''}${data.journalChange}% this month`);

        // Update class for positive/negative changes
        this.updateChangeClass('fastsChange', data.fastsChange);
        this.updateChangeClass('hoursChange', data.hoursChange);
        this.updateChangeClass('prayersChange', data.prayersChange);
        this.updateChangeClass('journalChange', data.journalChange);

        // Update streaks
        this.updateElementText('currentStreak', `${data.currentStreak || 0} days`);
        this.updateElementText('fastsThisMonth', data.fastsThisMonth || 0);

        // Update upcoming fasts
        this.upcomingFasts = data.upcomingFasts || [];
        this.updateUpcomingFastsDashboard();

        // Update calendar data
        this.fastingData = data.calendarData || [];
        this.renderCalendar();

        // Update recent activities
        this.recentActivities = data.recentActivities || [];
        this.updateRecentActivities();

        // Populate fast type filter with data from database
        if (data.fastPlanNames) {
            this.populateFastTypeFilter(data.fastPlanNames);
        }
    }

    updateUpcomingFastsDashboard() {
        const container = document.getElementById('upcomingFastsDashboard');
        if (!container) return;

        if (!this.upcomingFasts || this.upcomingFasts.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-clock fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No upcoming fasts scheduled</p>
                    <button class="btn btn-primary btn-sm" onclick="window.app.switchTab('fasting')">
                        Start a Fast
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = this.upcomingFasts.map(fast => {
            const startDate = new Date(fast.start_date);
            const now = new Date();
            const timeUntilStart = startDate - now;
            const daysUntilStart = Math.ceil(timeUntilStart / (1000 * 60 * 60 * 24));

            return `
                <div class="upcoming-fast-item mb-3 p-3 border rounded">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-1">${fast.plan_name}</h6>
                            <small class="text-muted">Starts: ${startDate.toLocaleDateString()}</small>
                        </div>
                        <div class="text-end">
                            <div class="countdown-timer text-warning fw-bold">
                                ${daysUntilStart > 0 ? `In ${daysUntilStart} days` : 'Starting soon'}
                            </div>
                            <small class="text-muted">${fast.duration_days} days</small>
                        </div>
                    </div>
                    ${fast.intention ? `
                        <div class="mt-2">
                            <small class="text-muted">Intention: ${fast.intention}</small>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        // Start countdown timers
        this.startDashboardTimers();
    }
	
	startDashboardTimers() {
        // Update countdown every minute for dashboard
        setInterval(() => {
            this.upcomingFasts.forEach((fast, index) => {
                const startDate = new Date(fast.start_date);
                const now = new Date();
                const timeUntilStart = startDate - now;
                const daysUntilStart = Math.ceil(timeUntilStart / (1000 * 60 * 60 * 24));
                
                const timerElement = document.querySelector(`.upcoming-fast-item:nth-child(${index + 1}) .countdown-timer`);
                if (timerElement) {
                    if (timeUntilStart <= 0) {
                        timerElement.textContent = 'Starting now';
                        timerElement.className = 'countdown-timer text-success fw-bold';
                    } else {
                        timerElement.textContent = `In ${daysUntilStart} day${daysUntilStart !== 1 ? 's' : ''}`;
                    }
                }
            });
        }, 60000); // Update every minute
    }
	
    // ADD THE MISSING FUNCTIONS:
	updateRecentActivities() {
        const container = document.getElementById('recentActivity');
        if (!container) return;

        if (!this.recentActivities || this.recentActivities.length === 0) {
            container.innerHTML = `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="fas fa-info-circle"></i>
                    </div>
                    <div class="activity-content">
                        <p>No recent activities. Start fasting, writing journals, or adding prayers to see activities here.</p>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = this.recentActivities.map(activity => {
            const date = new Date(activity.date);
            const timeAgo = this.getTimeAgo(date);
            const icon = this.getActivityIcon(activity.type);
            const statusClass = this.getStatusClass(activity.status);
            
            return `
                <div class="activity-item">
                    <div class="activity-icon ${activity.type}">
                        <i class="${icon}"></i>
                    </div>
                    <div class="activity-content">
                        <p class="activity-text">
                            <strong>${activity.action}:</strong> ${activity.title}
                        </p>
                        <div class="activity-meta">
                            <span class="activity-time">${timeAgo}</span>
                            <span class="activity-status ${statusClass}">${activity.status}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
	
	getActivityIcon(type) {
        const icons = {
            'fast': 'fas fa-fire',
            'journal': 'fas fa-book',
            'prayer': 'fas fa-praying-hands'
        };
        return icons[type] || 'fas fa-circle';
    }

    getStatusClass(status) {
        const classes = {
            'active': 'status-active',
            'completed': 'status-completed',
            'answered': 'status-answered'
        };
        return classes[status] || 'status-default';
    }
	
	getTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        
        return date.toLocaleDateString();
    }
	
    updateActiveFastsDisplay() {
        const container = document.getElementById('activeFastsContainer');
		if (!container) {
			console.error('Active fasts container not found');
			return;
		}

		if (!this.activeFasts || this.activeFasts.length === 0) {
			container.innerHTML = `
				<div class="no-data-message">
					<i class="fas fa-clock" style="font-size: 3rem; color: var(--text-light); margin-bottom: 1rem;"></i>
					<h3>No Active Fasts</h3>
					<p>Switch to the Fasting tab to start your first fast!</p>
				</div>
			`;
			return;
		}

        container.innerHTML = this.activeFasts.map(fast => `
            <div class="fast-item card" data-fast-id="${fast.id}">
                <div class="card-body">
                    <div class="fast-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h4 style="margin: 0; color: var(--primary);">${fast.plan_name}</h4>
                        <div class="fast-status" style="display: flex; align-items: center; gap: 1rem;">
                            <span class="status-badge" style="background: var(--success); color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem;">Active</span>
                            <span class="progress" style="font-weight: bold; color: var(--primary);">${fast.progress_percent}%</span>
                        </div>
                    </div>
                    
                    <div class="fast-timer" id="timer-${fast.id}" style="font-size: 1.5rem; font-weight: bold; text-align: center; margin: 1rem 0; color: var(--accent);">
                        Loading...
                    </div>
                    
                    <div class="fast-dates" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                        <div style="text-align: center;">
                            <small style="display: block; color: var(--text-light);">Started</small>
                            <strong>${new Date(fast.start_date).toLocaleDateString()}</strong>
                        </div>
                        <div style="text-align: center;">
                            <small style="display: block; color: var(--text-light);">Ends</small>
                            <strong>${new Date(fast.end_date).toLocaleDateString()}</strong>
                        </div>
                    </div>
                    
                    <div class="progress-bar" style="height: 8px; background: var(--medium-gray); border-radius: 4px; overflow: hidden; margin: 1rem 0;">
                        <div class="progress-fill" style="height: 100%; background: var(--primary); width: ${fast.progress_percent}%; transition: width 0.3s ease;"></div>
                    </div>
                    
                    <div class="fast-actions" style="display: flex; gap: 0.5rem; justify-content: center;">
                        <button class="btn btn-outline btn-small" onclick="dashboard.pauseFast(${fast.id})">
                            <i class="fas fa-pause"></i> Pause
                        </button>
                        <button class="btn btn-outline btn-small" onclick="dashboard.endFast(${fast.id})">
                            <i class="fas fa-stop"></i> End
                        </button>
                        <button class="btn btn-outline btn-small" onclick="dashboard.logActivity(${fast.id})">
                            <i class="fas fa-plus"></i> Log Activity
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        this.startAllTimers();
    }

    startAllTimers() {
        if (!this.activeFasts) return;
        
        this.activeFasts.forEach(fast => {
            this.startTimer(fast);
        });
    }

    startTimer(fast) {
        const updateTimer = () => {
            const now = new Date();
            const endDate = new Date(fast.end_date);
            const remaining = endDate - now;

            if (remaining <= 0) {
                if (fast.timerInterval) {
                    clearInterval(fast.timerInterval);
                }
                this.completeFast(fast.id);
                return;
            }

            const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
            const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

            const timerElement = document.getElementById(`timer-${fast.id}`);
            if (timerElement) {
                if (days > 0) {
                    timerElement.textContent = `${days}d ${hours}h ${minutes}m`;
                } else {
                    timerElement.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                }
            }
        };

        fast.timerInterval = setInterval(updateTimer, 1000);
        updateTimer();
    }

    updateFilterValues() {
        const yearFilter = document.getElementById('yearFilter');
        const monthFilter = document.getElementById('monthFilter');
        
        if (yearFilter) yearFilter.value = this.filters.year;
        if (monthFilter) monthFilter.value = this.filters.month;
    }

    previousMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.renderCalendar();
        this.loadMonthData();
    }

    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.renderCalendar();
        this.loadMonthData();
    }

    async loadMonthData() {
        try {
            const response = await this.apiCall('dashboard/calendar.php', 'POST', {
                year: this.currentDate.getFullYear(),
                month: this.currentDate.getMonth() + 1
            });
            if (response.success) {
                this.fastingData = response.data || [];
                this.renderCalendar();
            }
        } catch (error) {
            console.error('Error loading month data:', error);
        }
    }

    handleQuickAction(action) {
        console.log('Quick action:', action);
        if (window.app && window.app.switchTab) {
            switch(action) {
                case 'chat':
                    window.app.switchTab('chat');
                    break;
                case 'write-journal':
                    window.app.switchTab('journal');
                    break;
                case 'add-prayer':
                    window.app.switchTab('prayers');
                    break;
                case 'read-bible':
                    window.app.switchTab('bible');
                    break;
            }
        }
    }

    viewDayDetails(dateStr, dayData) {
        if (!dayData) {
            this.showNotification(`No fasting activities on ${dateStr}`, 'info');
            return;
        }

        const plans = dayData.plan_names ? dayData.plan_names.join(', ') : 'Various plans';
        const statuses = dayData.statuses ? dayData.statuses.join(', ') : 'Various statuses';
        
        const message = `
            Fasting Activities on ${dateStr}:
            • ${dayData.fast_count} fast(s)
            • Plans: ${plans}
            • Status: ${statuses}
        `;
        
        this.showNotification(message.replace(/\s+/g, ' ').trim(), 'info');
    }


    updateChangeClass(elementId, change) {
        const element = document.getElementById(elementId);
        if (element) {
            element.className = change >= 0 ? 'positive' : 'negative';
        }
    }

    updateElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        }
    }

    initializeCalendar() {
        console.log('Initializing calendar...');
        this.renderCalendar();
    }

     renderCalendar() {
        const calendarDays = document.getElementById('calendarDays');
        if (!calendarDays) {
            console.error('Calendar days element not found');
            return;
        }

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // Update month/year display
        this.updateElementText('currentMonthYear', 
            this.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));

        // Get first day of month and days in month
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();

        calendarDays.innerHTML = '';

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day empty';
            calendarDays.appendChild(emptyDay);
        }

        // Add days of the month
        const today = new Date();
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            
            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const dayData = this.fastingData[dateStr];
            const isToday = today.getFullYear() === year && 
                           today.getMonth() === month && 
                           today.getDate() === day;
            
            if (isToday) {
                dayElement.classList.add('today');
            }
            
            if (dayData) {
                dayElement.classList.add('fasting-day');
                if (dayData.fast_count > 1) {
                    dayElement.classList.add('multiple-fasts');
                }
            }

            dayElement.innerHTML = `
                <div class="day-number">${day}</div>
                <div class="day-events">
                    ${dayData ? `
                        <div class="event-dot" title="${dayData.fast_count} fast(s) on this day"></div>
                        ${dayData.fast_count > 1 ? '<div class="event-dot secondary"></div>' : ''}
                    ` : ''}
                </div>
            `;

            dayElement.addEventListener('click', () => this.viewDayDetails(dateStr, dayData));
            calendarDays.appendChild(dayElement);
        }
    }
	

    loadDemoData() {
        console.log('Loading demo data...');
        const demoData = {
            totalFasts: 5,
            totalHours: 120,
            prayersCount: 15,
            journalEntries: 8,
            fastsChange: 25,
            hoursChange: 15,
            prayersChange: 40,
            journalChange: 20,
            currentStreak: 7,
            fastsThisMonth: 2,
            activeFasts: [
                {
                    id: 1,
                    plan_name: 'Daniel Fast',
                    start_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                    end_date: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000).toISOString(),
                    progress_percent: 25
                }
            ],
            calendarData: this.generateDemoCalendarData()
        };
        
        this.updateDashboardWithData(demoData);
    }

    generateDemoCalendarData() {
        const data = [];
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        // Add some demo fasting and prayer days
        for (let i = 1; i <= 7; i++) {
            const date = new Date(currentYear, currentMonth, i * 4);
            if (date.getMonth() === currentMonth) {
                data.push({
                    date: date.toISOString().split('T')[0],
                    fasting: Math.random() > 0.5,
                    prayer: Math.random() > 0.3
                });
            }
        }
        
        return data;
    }

    async apiCall(endpoint, method = 'GET', data = null) {
        return await AuthHelper.apiCall(endpoint, method, data);
    }

    showNotification(message, type) {
        if (window.app && window.app.showGlobalNotification) {
            window.app.showGlobalNotification(message, type);
        } else {
            // Simple fallback notification
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                padding: 1rem;
                border-radius: 8px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                z-index: 10000;
                border-left: 4px solid ${type === 'error' ? 'red' : type === 'success' ? 'green' : 'blue'};
            `;
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 3000);
        }
    }
	

}

// Make dashboard globally accessible
if (typeof window !== 'undefined') {
    window.Dashboard = Dashboard;
    window.dashboard = null; // Will be initialized later
}