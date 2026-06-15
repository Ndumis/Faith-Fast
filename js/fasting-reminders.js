// Lightweight shared store for client-side fasting reminder notifications.
// Persisted in localStorage so they survive reloads; rendered inside the
// same notification dropdown as server-sourced notifications (js/app.js).
const FastingReminders = {
    STORAGE_LIST_KEY: 'ff_active_reminders',

    add({ type, title, message, link_tab, storageKey }) {
        const list = this.getAll();
        if (list.some(n => n.id === storageKey)) return;

        list.push({
            id: storageKey,
            local: true,
            type,
            title,
            message,
            link_tab,
            is_read: 0,
            created_at: new Date().toISOString()
        });
        localStorage.setItem(this.STORAGE_LIST_KEY, JSON.stringify(list));

        if (window.app && typeof window.app.refreshNotificationBadgeWithLocal === 'function') {
            window.app.refreshNotificationBadgeWithLocal();
        }
    },

    getAll() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_LIST_KEY) || '[]');
        } catch (e) {
            return [];
        }
    },

    dismiss(id) {
        const list = this.getAll().filter(n => n.id !== id);
        localStorage.setItem(this.STORAGE_LIST_KEY, JSON.stringify(list));
    },

    unreadCount() {
        return this.getAll().length;
    }
};
