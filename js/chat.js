class Chat {
    constructor() {
        this.groups = [];
        this.messages = [];
        this.users = [];
        this.currentGroup = null;
        this.currentChatUser = null;
        this.pollingInterval = null;
        this.unreadMessages = 0;
        this.mentionCandidates = [];
    }

    async init() {
        console.log('Initializing Chat tab...');
        
        if (!this.isChatPage()) {
            console.log('Not on chat page, skipping initialization');
            return;
        }
        
        try {
            await this.loadGroups();
            await this.loadUsers();
            this.bindEvents();
            this.renderGroups();
            this.renderUsers();
            this.startChatPolling();
            this.updateUnreadBadge();
            console.log('✅ Chat tab initialized successfully');
        } catch (error) {
            console.error('❌ Chat initialization failed:', error);
            this.loadDemoData();
        }

        adjustChatLayout();
    }

    isChatPage() {
        // Check if key chat page elements exist
        return !!document.getElementById('groupsList');
    }

    bindEvents() {
		console.log('Binding chat events...');

		// Note: #sendMessage click and #messageInput Enter-to-send are bound
		// once in initializeChatInput() (which clones the elements to avoid
		// duplicate listeners). Binding them again here would send every
		// message twice.

		// Group selection - now entire group item is clickable
		// Bound once globally to avoid piling up duplicate listeners across
		// repeated chat tab visits/re-inits.
		if (!window._chatDocClickBound) {
			window._chatDocClickBound = true;
			document.addEventListener('click', (e) => {
				const groupItem = e.target.closest('.group-item');
				if (groupItem) {
					const groupId = groupItem.getAttribute('data-group-id');
					if (window.chatInstance) window.chatInstance.selectGroup(groupId);
				}

				// User selection for direct chat
				const userItem = e.target.closest('.user-item');
				if (userItem) {
					const userId = userItem.getAttribute('data-user-id');
					if (window.chatInstance) window.chatInstance.selectUser(userId);
				}
			});
		}

		// Search functionality
		const searchInput = document.getElementById('chatSearch');
		if (searchInput) {
			searchInput.addEventListener('input', (e) => {
				this.filterChats(e.target.value);
			});
		}

        // Mobile sidebar toggle
        this.bindMobileToggle();
    }

    async loadGroups() {
        try {
            const response = await this.apiCall('chat/groups.php');
            this.groups = response.groups || [];
            console.log('Loaded chat groups:', this.groups.length);
        } catch (error) {
            console.error('Error loading groups:', error);
        }
    }

    async loadUsers() {
        try {
            const response = await this.apiCall('chat/users.php');
            this.users = response.users || [];
            console.log('Loaded chat users:', this.users.length);
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    async loadMessages(groupId = null, userId = null) {
        if (!groupId && !userId) return;
        
        try {
            let endpoint = '';
            if (groupId) {
                endpoint = `chat/messages.php?group_id=${groupId}`;
            } else if (userId) {
                endpoint = `chat/direct-messages.php?user_id=${userId}`;
            }
            
            const response = await this.apiCall(endpoint);
            this.messages = response.messages || [];
            this.renderMessages();
            
            // Mark messages as read
            if (this.messages.length > 0) {
                await this.markMessagesAsRead(groupId, userId);
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }
	
	async markMessagesAsRead(groupId = null, userId = null) {
        try {
            await this.apiCall('chat/mark-read.php', 'POST', {
                group_id: groupId,
                user_id: userId
            });
            this.updateUnreadBadge();
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    }

    renderGroups() {
		const container = document.getElementById('groupsList');
		if (!container) return;
		
		const myGroups = this.groups.filter(group => group.is_member || group.owner_id === this.getCurrentUserId());
		
		if (myGroups.length === 0) {
			container.innerHTML = '<div class="no-data-message"><i class="fas fa-users"></i><p>No groups yet. Create or join a group!</p></div>';
			return;
		}

		container.innerHTML = myGroups.map(group => `
			<div class="group-item ${this.currentGroup === group.id ? 'active' : ''}" data-group-id="${group.id}">
				<div class="group-avatar">
					<i class="fas fa-users"></i>
					${group.unread_count > 0 ? `<span class="unread-badge">${group.unread_count}</span>` : ''}
				</div>
				<div class="group-info">
					<h4>${this.escapeHtml(group.name)}</h4>
					<div class="group-meta">
						<span class="member-count">${group.member_count || 0} members</span>
						<span class="online-count">${group.online_count || 0} online</span>
					</div>
				</div>
			</div>
		`).join('');
	}

    renderUsers() {
		const container = document.getElementById('onlineUsersList');
		if (!container) return;
		
		// Sort users: online first, then offline
		const onlineUsers = this.users.filter(user => user.is_online);
		const offlineUsers = this.users.filter(user => !user.is_online);
		
		let html = '';
		
		// Online users section
		if (onlineUsers.length > 0) {
			html += '<div class="users-section">';
			html += '<h4>Online Users</h4>';
			html += onlineUsers.map(user => `
				<div class="user-item ${this.currentChatUser === user.id ? 'active' : ''}" data-user-id="${user.id}">
					<div class="user-avatar online">
						<i class="fas fa-user"></i>
					</div>
					<div class="user-info">
						<span class="user-name">${this.escapeHtml(user.name)}</span>
						<span class="user-status online">Online</span>
						${user.unread_count > 0 ? `<span class="unread-indicator"></span>` : ''}
					</div>
				</div>
			`).join('');
			html += '</div>';
		}
		
		// Offline users section
		if (offlineUsers.length > 0) {
			html += '<div class="users-section">';
			html += '<h4>Offline Users</h4>';
			html += offlineUsers.map(user => `
				<div class="user-item ${this.currentChatUser === user.id ? 'active' : ''}" data-user-id="${user.id}">
					<div class="user-avatar">
						<i class="fas fa-user"></i>
					</div>
					<div class="user-info">
						<span class="user-name">${this.escapeHtml(user.name)}</span>
						<span class="user-status offline">Offline</span>
						${user.unread_count > 0 ? `<span class="unread-indicator"></span>` : ''}
					</div>
				</div>
			`).join('');
			html += '</div>';
		}
		
		// If no users at all
		if (onlineUsers.length === 0 && offlineUsers.length === 0) {
			html = '<div class="no-data-message"><i class="fas fa-users"></i><p>No users found</p></div>';
		}
		
		container.innerHTML = html;
	}

    renderMessages() {
		const container = document.getElementById('chatMessages');
		const chatHeader = document.getElementById('chatHeader');
		
		if (!container) return;
		
		if (!this.currentGroup && !this.currentChatUser) {
			container.innerHTML = `
				<div class="welcome-message">
					<i class="fas fa-comments"></i>
					<h3>Welcome to Chat</h3>
					<p>Select a user or group to start chatting</p>
				</div>
			`;
			if (chatHeader) {
				chatHeader.innerHTML = `
					<button id="chatSidebarToggle" class="mobile-only">
						<i class="fas fa-bars"></i>
					</button>
					<div class="chat-header-info">
						<h3>Select a chat</h3>
					</div>
				`;
				this.bindMobileToggle();
			}
			return;
		}

		// Update chat header - ALWAYS include the toggle button on mobile
		if (chatHeader) {
			let headerContent = '';
			
			// Add toggle button for mobile
			headerContent += `
				<button id="chatSidebarToggle" class="mobile-only">
					<i class="fas fa-bars"></i>
				</button>
			`;
			
			if (this.currentGroup) {
				const group = this.groups.find(g => g.id == this.currentGroup);
				headerContent += `
					<div class="chat-header-info">
						<h3>${group ? this.escapeHtml(group.name) : 'Group Chat'}</h3>
						<span class="online-count">${group ? (group.online_count || 0) : 0} online</span>
					</div>
				`;
			} else if (this.currentChatUser) {
				const user = this.users.find(u => u.id == this.currentChatUser);
				headerContent += `
					<div class="chat-header-info">
						<h3>${user ? this.escapeHtml(user.name) : 'Direct Chat'}</h3>
						<span class="user-status ${user && user.is_online ? 'online' : 'offline'}">
							${user && user.is_online ? 'Online' : 'Offline'}
						</span>
					</div>
				`;
			}
			
			chatHeader.innerHTML = headerContent;
			this.bindMobileToggle();
		}

		if (this.messages.length === 0) {
			container.innerHTML = `
				<div class="no-messages">
					<i class="fas fa-comment-slash"></i>
					<h3>No messages yet</h3>
					<p>Start the conversation!</p>
				</div>
			`;
			return;
		}

		const currentUserId = this.getCurrentUserId();
		container.innerHTML = this.messages.map(message => {
			const isOwnMessage = message.sender_id == currentUserId || message.is_own;
			const senderName = message.sender_name || message.user_name || 'Unknown';
			const messageTime = message.created_at ? this.formatTime(message.created_at) : 'Just now';
			const messageText = message.message || message.text || '';
			const isSticker = this.isStickerMessage(messageText);
			const bodyHtml = isSticker
				? this.escapeHtml(messageText)
				: this.formatMentions(this.escapeHtml(messageText));

			return `
				<div class="message ${isOwnMessage ? 'own-message' : 'other-message'}" data-message-id="${message.id || ''}">
					<div class="message-avatar">
						<i class="fas fa-user"></i>
					</div>
					<div class="message-content">
						<div class="message-text${isSticker ? ' sticker-message' : ''}">${bodyHtml}</div>
						<span class="message-time">${messageTime}</span>
					</div>
				</div>
			`;
		}).join('');

		// Scroll to bottom
		container.scrollTop = container.scrollHeight;
	}

    async sendMessage() {        
		const messageInput = document.getElementById('messageInput');
        if (!messageInput || (!this.currentGroup && !this.currentChatUser)) return;

        const message = messageInput.value.trim();
        if (!message) return;

        try {
            const messageData = {
                message: message,
                message_type: 'text'
            };

            if (this.currentGroup) {
                messageData.group_id = this.currentGroup;
            } else if (this.currentChatUser) {
                messageData.receiver_id = this.currentChatUser;
            }

            const response = await this.apiCall('chat/send.php', 'POST', messageData);

            if (response.success) {
                messageInput.value = '';
				messageInput.style.height = '42px';
				
				// Focus back on input
				messageInput.focus();
                await this.loadMessages(this.currentGroup, this.currentChatUser);
            }
        } catch (error) {
            this.showNotification('Error sending message', 'error');
        }
    }

    selectGroup(groupId) {
        this.currentGroup = groupId;
        this.currentChatUser = null;
        this.loadMessages(groupId);
        this.loadGroupMembers(groupId);
        this.updateUI();
    }

	selectUser(userId) {
        this.currentChatUser = userId;
        this.currentGroup = null;
        this.loadMessages(null, userId);
        const user = this.users.find(u => u.id == userId);
        this.mentionCandidates = user ? [user] : [];
        this.updateUI();
    }

    // Load the members of a group so @mentions can be scoped to people
    // actually in this conversation
    async loadGroupMembers(groupId) {
        try {
            const response = await this.apiCall(`chat/group-members.php?group_id=${groupId}`);
            const members = response.success ? (response.members || []) : [];
            const currentUserId = this.getCurrentUserId();
            this.mentionCandidates = members.filter(m => m.id != currentUserId);
        } catch (error) {
            console.error('Error loading group members:', error);
            this.mentionCandidates = [];
        }
    }
	
	updateUI() {
        // Update group selection
        document.querySelectorAll('.group-item').forEach(item => {
            item.classList.remove('active');
        });
        
        if (this.currentGroup) {
            const selectedGroup = document.querySelector(`[data-group-id="${this.currentGroup}"]`);
            if (selectedGroup) {
                selectedGroup.classList.add('active');
            }
        }

        // Update user selection
        document.querySelectorAll('.user-item').forEach(item => {
            item.classList.remove('active');
        });
        
        if (this.currentChatUser) {
            const selectedUser = document.querySelector(`[data-user-id="${this.currentChatUser}"]`);
            if (selectedUser) {
                selectedUser.classList.add('active');
            }
        }
    }
	
	async updateUnreadBadge() {
        try {
            const response = await this.apiCall('chat/unread-count.php');
            this.unreadMessages = response.unread_count || 0;
            
            // Update dashboard badge
            const chatBadge = document.getElementById('chatBadge');
            if (chatBadge) {
                chatBadge.textContent = this.unreadMessages;
                chatBadge.style.display = this.unreadMessages > 0 ? 'flex' : 'none';
            }
        } catch (error) {
            console.error('Error updating unread badge:', error);
        }
    }
	
	filterChats(searchTerm) {
        const groups = document.querySelectorAll('.group-item');
        const users = document.querySelectorAll('.user-item');
        
        groups.forEach(group => {
            const groupName = group.querySelector('h4').textContent.toLowerCase();
            group.style.display = groupName.includes(searchTerm.toLowerCase()) ? 'flex' : 'none';
        });
        
        users.forEach(user => {
            const userName = user.querySelector('.user-name').textContent.toLowerCase();
            user.style.display = userName.includes(searchTerm.toLowerCase()) ? 'flex' : 'none';
        });
    }

    getCurrentUserId() {
        // This should be replaced with actual user ID from authentication
        const user = AuthHelper.getUser();
        return user ? user.id : 1; // Fallback to 1 for demo
    }

    startChatPolling() {
        // Clear existing interval
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
        
        // Poll for new messages every 5 seconds only if a group is selected
        this.pollingInterval = setInterval(async () => {
            if (this.currentGroup) {
                await this.loadMessages(this.currentGroup);
                await this.loadUsers(); // Also update online users
            }
        }, 5000);
    }

    showCreateGroupModal() {
        this.showNotification('Group creation feature coming soon!', 'info');
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // A message consisting of just 1-6 emoji is shown as a big "sticker"
    isStickerMessage(text) {
        const trimmed = text.trim();
        if (!trimmed) return false;
        const emojiRegex = /^(?:[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}️‍]){1,6}$/u;
        return emojiRegex.test(trimmed);
    }

    // Highlight @mentions of known users. Expects already-escaped text.
    formatMentions(escapedText) {
        if (!this.users || this.users.length === 0) return escapedText;
        const names = this.users
            .map(u => u.name)
            .filter(Boolean)
            .sort((a, b) => b.length - a.length)
            .map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        if (names.length === 0) return escapedText;
        const pattern = new RegExp('@(' + names.join('|') + ')\\b', 'g');
        return escapedText.replace(pattern, '<span class="mention">@$1</span>');
    }

    // Wire up @mention autocomplete on the message textarea
    bindMentionAutocomplete(textarea) {
        const dropdown = document.getElementById('mentionDropdown');
        if (!textarea || !dropdown) return;

        textarea.addEventListener('input', () => {
            this.updateMentionDropdown(textarea, dropdown);
        });

        textarea.addEventListener('keydown', (e) => {
            if (!dropdown.classList.contains('active')) return;
            const items = dropdown.querySelectorAll('.mention-item');
            if (!items.length) return;

            let highlighted = dropdown.querySelector('.mention-item.highlighted');
            let index = highlighted ? Array.from(items).indexOf(highlighted) : -1;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                index = (index + 1) % items.length;
                items.forEach(i => i.classList.remove('highlighted'));
                items[index].classList.add('highlighted');
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                index = (index - 1 + items.length) % items.length;
                items.forEach(i => i.classList.remove('highlighted'));
                items[index].classList.add('highlighted');
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                const target = highlighted || items[0];
                this.selectMention(textarea, dropdown, target.dataset.name);
            } else if (e.key === 'Escape') {
                dropdown.classList.remove('active');
            }
        });
    }

    // Find the @-prefixed text fragment immediately before the cursor, if any
    getMentionQuery(textarea) {
        const cursor = textarea.selectionStart;
        const text = textarea.value.slice(0, cursor);
        const match = text.match(/@([\w]*)$/);
        return match ? match[1] : null;
    }

    updateMentionDropdown(textarea, dropdown) {
        const query = this.getMentionQuery(textarea);
        if (query === null) {
            dropdown.classList.remove('active');
            return;
        }

        const matches = this.mentionCandidates.filter(u =>
            u.name && u.name.toLowerCase().startsWith(query.toLowerCase())
        ).slice(0, 6);

        if (matches.length === 0) {
            dropdown.classList.remove('active');
            return;
        }

        dropdown.innerHTML = matches.map(u => `
            <div class="mention-item" data-name="${this.escapeHtml(u.name)}">
                <span class="mention-item-avatar"><i class="fas fa-user"></i></span>
                <span>${this.escapeHtml(u.name)}</span>
            </div>
        `).join('');
        dropdown.querySelector('.mention-item').classList.add('highlighted');
        dropdown.classList.add('active');
    }

    selectMention(textarea, dropdown, name) {
        const cursor = textarea.selectionStart;
        const text = textarea.value;
        const before = text.slice(0, cursor);
        const after = text.slice(cursor);
        const match = before.match(/@([\w]*)$/);
        if (!match) return;

        const start = before.length - match[0].length;
        const mentionText = `@${name} `;
        textarea.value = before.slice(0, start) + mentionText + after;
        const newPos = start + mentionText.length;
        textarea.selectionStart = textarea.selectionEnd = newPos;
        dropdown.classList.remove('active');
        textarea.focus();
    }

    // Add this method to handle mobile toggle binding
    bindMobileToggle() {
        const toggleBtn = document.getElementById('chatSidebarToggle');
        const sidebar = document.querySelector('.chat-sidebar');
        const overlay = document.querySelector('.chat-overlay');

        if (toggleBtn && sidebar && overlay) {
            // Remove existing event listeners to avoid duplicates
            toggleBtn.replaceWith(toggleBtn.cloneNode(true));
            const newToggleBtn = document.getElementById('chatSidebarToggle');
            
            newToggleBtn.addEventListener('click', () => {
                sidebar.classList.toggle('open');
                overlay.classList.toggle('active');
            });

            overlay.addEventListener('click', () => {
                sidebar.classList.remove('open');
                overlay.classList.remove('active');
            });
        }
    }

    loadDemoData() {
        console.log('Loading demo chat data...');
        
        // Demo groups
        this.groups = [
            {
                id: 1,
                name: 'Fasting Support',
                description: 'Share your fasting journey and support each other',
                member_count: 24,
                online_count: 8
            },
            {
                id: 2,
                name: 'Prayer Warriors',
                description: 'Pray together and share prayer requests',
                member_count: 15,
                online_count: 3
            },
            {
                id: 3,
                name: 'Bible Study',
                description: 'Discuss scripture and share insights',
                member_count: 18,
                online_count: 5
            }
        ];
        
        // Demo users
        this.users = [
            { id: 1, name: 'John Smith', is_online: true },
            { id: 2, name: 'Sarah Johnson', is_online: true },
            { id: 3, name: 'Mike Davis', is_online: false },
            { id: 4, name: 'Emily Wilson', is_online: true }
        ];
        
        // Demo messages for first group
        this.messages = [
            {
                id: 1,
                message: 'Welcome everyone! How is your fasting going today?',
                sender_name: 'John Smith',
                is_own: false,
                created_at: new Date(Date.now() - 300000).toISOString()
            },
            {
                id: 2,
                message: 'Going well! Day 3 of my Daniel fast. Feeling blessed!',
                sender_name: 'Sarah Johnson',
                is_own: false,
                created_at: new Date(Date.now() - 240000).toISOString()
            },
            {
                id: 3,
                message: 'That\'s awesome Sarah! I\'m on day 5, the spiritual clarity is amazing.',
                sender_name: 'You',
                is_own: true,
                created_at: new Date(Date.now() - 120000).toISOString()
            }
        ];
        
        this.renderGroups();
        this.renderUsers();
    }

    async apiCall(endpoint, method = 'GET', data = null) {
		const token = AuthHelper.getToken();
		const options = {
			method: method,
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'application/json'
			}
		};

		if (token) {
			options.headers['Authorization'] = `Bearer ${token}`;
		}

		if (data) {
			options.body = JSON.stringify(data);
		}

		try {
			const response = await fetch('api/' + endpoint, options);
			
			if (response.status === 401) {
				AuthHelper.handleUnauthorized();
				throw new Error('Authentication required');
			}
			
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			return await response.json();
		} catch (error) {
			console.error(`API call to ${endpoint} failed:`, error);
			throw error;
		}
	}

    showNotification(message, type) {
        if (window.app && window.app.showGlobalNotification) {
            window.app.showGlobalNotification(message, type);
        } else {
            // Fallback notification
            alert(`${type.toUpperCase()}: ${message}`);
        }
    }

    // Cleanup when leaving chat tab
    destroy() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }
	
	
}

// Fit the chat container to the visible viewport on mobile/tablet so the
// message input never ends up below the fold (header height varies by device).
function adjustChatLayout() {
  const container = document.querySelector('.chat-container');
  if (!container) return;

  if (window.innerWidth <= 768) {
    const top = container.getBoundingClientRect().top;
    const available = window.innerHeight - top - 16;
    container.style.height = Math.max(available, 380) + 'px';
  } else {
    container.style.height = '';
  }

  const messages = document.getElementById('chatMessages');
  if (messages) {
    messages.scrollTop = messages.scrollHeight;
  }
}

const EMOJI_LIST = [
  '😀','😃','😄','😁','😆','😅','😂','🙂','🙃','😉','😊','😇',
  '🥰','😍','😘','😗','😋','😛','🤗','🤔','😐','😴','😪','😢',
  '😭','😡','😠','🤯','😱','😨','😰','😥','😓','🤝','👍','👎',
  '👏','🙌','🙏','💪','✌️','🤞','👋','❤️','🧡','💛','💚','💙',
  '💜','🖤','🤍','💖','💕','✨','🔥','🎉','🎊','🌟','⭐','☀️',
  '🌙','⛅','🌈','🍞','🍎','☕','📖','✝️','🕊️','⛪'
];

const STICKER_LIST = [
  '🙏','✝️','📖','🕊️','🔥','😇','✨','⭐','💪','❤️',
  '🎉','👏','🙌','☀️','🌙','⛪'
];

function populateEmojiPicker() {
  const emojiGrid = document.querySelector('#emojiPicker .emoji-grid[data-panel="emoji"]');
  const stickerGrid = document.querySelector('#emojiPicker .emoji-grid[data-panel="stickers"]');
  if (emojiGrid && !emojiGrid.children.length) {
    emojiGrid.innerHTML = EMOJI_LIST.map(e => `<button type="button" data-emoji="${e}">${e}</button>`).join('');
  }
  if (stickerGrid && !stickerGrid.children.length) {
    stickerGrid.innerHTML = STICKER_LIST.map(e => `<button type="button" data-emoji="${e}">${e}</button>`).join('');
  }
}

function insertAtCursor(textarea, text) {
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  const value = textarea.value;
  textarea.value = value.slice(0, start) + text + value.slice(end);
  const newPos = start + text.length;
  textarea.selectionStart = textarea.selectionEnd = newPos;
  textarea.focus();
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

// Wire up the emoji/sticker picker toggle - bound once globally since
// #emojiToggle and #emojiPicker are not re-cloned on every tab visit
function bindEmojiPicker() {
  if (window._emojiPickerBound) return;
  window._emojiPickerBound = true;

  const toggle = document.getElementById('emojiToggle');
  const picker = document.getElementById('emojiPicker');
  if (!toggle || !picker) return;

  populateEmojiPicker();

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    picker.classList.toggle('active');
  });

  picker.querySelectorAll('.emoji-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      picker.querySelectorAll('.emoji-tab').forEach(t => t.classList.remove('active'));
      picker.querySelectorAll('.emoji-grid').forEach(g => g.classList.remove('active'));
      tab.classList.add('active');
      picker.querySelector(`.emoji-grid[data-panel="${tab.dataset.panel}"]`).classList.add('active');
    });
  });

  picker.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-emoji]');
    if (!btn) return;
    const messageInput = document.getElementById('messageInput');
    if (messageInput) insertAtCursor(messageInput, btn.dataset.emoji);
  });

  document.addEventListener('click', (e) => {
    if (!picker.classList.contains('active')) return;
    if (!picker.contains(e.target) && e.target !== toggle && !toggle.contains(e.target)) {
      picker.classList.remove('active');
    }
  });
}

// Wire up the mention dropdown's click-to-select and click-outside-to-close
// behavior. Bound once globally; fetches #messageInput fresh on each click
// since the textarea gets re-cloned every time the chat tab is opened.
function bindMentionDropdown() {
  if (window._mentionDropdownBound) return;
  window._mentionDropdownBound = true;

  const dropdown = document.getElementById('mentionDropdown');
  if (!dropdown) return;

  dropdown.addEventListener('click', (e) => {
    const item = e.target.closest('.mention-item');
    if (!item) return;
    const messageInput = document.getElementById('messageInput');
    if (messageInput && window.chatInstance) {
      window.chatInstance.selectMention(messageInput, dropdown, item.dataset.name);
    }
  });

  document.addEventListener('click', (e) => {
    if (!dropdown.classList.contains('active')) return;
    const messageInput = document.getElementById('messageInput');
    if (!dropdown.contains(e.target) && e.target !== messageInput) {
      dropdown.classList.remove('active');
    }
  });
}

// Auto-resize textarea and ensure button visibility
function initializeChatInput() {
  const messageInput = document.getElementById('messageInput');
  const sendButton = document.getElementById('sendMessage');

  if (!window._chatLayoutBound) {
    window.addEventListener('resize', adjustChatLayout);
    window.addEventListener('orientationchange', () => setTimeout(adjustChatLayout, 250));
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', adjustChatLayout);
    }
    window._chatLayoutBound = true;
  }
  adjustChatLayout();
  bindEmojiPicker();
  bindMentionDropdown();

  if (messageInput && sendButton) {
    // Remove any existing event listeners to prevent duplicates
    const newMessageInput = messageInput.cloneNode(true);
    const newSendButton = sendButton.cloneNode(true);
    
    messageInput.parentNode.replaceChild(newMessageInput, messageInput);
    sendButton.parentNode.replaceChild(newSendButton, sendButton);
    
    // Get new references
    const messageInputNew = document.getElementById('messageInput');
    const sendButtonNew = document.getElementById('sendMessage');
    
    // Force button to be visible
    sendButtonNew.style.display = 'flex';
    sendButtonNew.style.visibility = 'visible';
    sendButtonNew.style.opacity = '1';
    
    // Auto-resize textarea - 5 lines max
    messageInputNew.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 140) + 'px'; // Max 140px for 5 lines
    });
    
    // Handle Enter key (send on Enter, new line on Shift+Enter)
    // Skip if the @mention dropdown is open - it handles Enter itself
    messageInputNew.addEventListener('keydown', function(e) {
      const mentionDropdown = document.getElementById('mentionDropdown');
      if (mentionDropdown && mentionDropdown.classList.contains('active')) return;

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        // Call the chat instance's sendMessage method
        if (window.chatInstance) {
          window.chatInstance.sendMessage();
        }
      }
    });
    
    // Send button click - only bind once
    sendButtonNew.addEventListener('click', function(e) {
      e.preventDefault();
      if (window.chatInstance) {
        window.chatInstance.sendMessage();
      }
    });
    
    // Remove onclick from HTML to prevent duplicate binding
    sendButtonNew.removeAttribute('onclick');

    // @mention autocomplete
    if (window.chatInstance) {
      window.chatInstance.bindMentionAutocomplete(messageInputNew);
    }

    // Ensure button stays visible on focus, and re-fit layout once the
    // on-screen keyboard finishes opening/closing
    messageInputNew.addEventListener('focus', function() {
      sendButtonNew.style.display = 'flex';
      sendButtonNew.style.visibility = 'visible';
      setTimeout(adjustChatLayout, 300);
    });
    messageInputNew.addEventListener('blur', function() {
      setTimeout(adjustChatLayout, 300);
    });
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Create global chat instance if it doesn't exist
  if (!window.chatInstance) {
    window.chatInstance = new Chat();
  }
  
  // Initialize chat input
  initializeChatInput();
  
  // Initialize chat functionality when tab is shown
  const chatTab = document.querySelector('[data-tab="chat"]');
  if (chatTab) {
    // Remove any existing event listeners
    const newChatTab = chatTab.cloneNode(true);
    chatTab.parentNode.replaceChild(newChatTab, chatTab);
    
    // Add new event listener
    document.querySelector('[data-tab="chat"]').addEventListener('click', function() {
      setTimeout(() => {
        initializeChatInput();
        if (window.chatInstance) {
          window.chatInstance.init();
        }
      }, 100);
    });
  }
  
  // Also initialize when the page loads if chat tab is active
  if (document.querySelector('[data-tab="chat"]')?.classList.contains('active')) {
    setTimeout(() => {
      if (window.chatInstance) {
        window.chatInstance.init();
      }
    }, 100);
  }
});