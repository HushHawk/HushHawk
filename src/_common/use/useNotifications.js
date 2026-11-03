import { ref, computed } from 'vue';

// Global singleton state shared across all components
const notifications = ref([]);
const unreadCount = ref(0);
const loading = ref(false);
const isNotifOpen = ref(false);
const toasts = ref([]);

let pollingInterval = null;

async function fetchNotifications() {
    try {
        loading.value = true;
        const res = await fetch('/api/v1/notifications');
        if (res.ok) {
            const data = await res.json();
            notifications.value = data.notifications || [];
            unreadCount.value = Number(data.unread_count ?? (notifications.value.filter(n => !n.is_read).length));
        }
    } catch (err) {
        console.warn('[useNotifications] Failed to fetch:', err);
    } finally {
        loading.value = false;
    }
}

async function markAsRead(notificationId) {
    const target = notifications.value.find(n => n.id === notificationId || n.notification_id === notificationId);
    if (target && !target.is_read) {
        target.is_read = true;
        unreadCount.value = Math.max(0, unreadCount.value - 1);
    }
    try {
        await fetch(`/api/v1/notifications/${encodeURIComponent(notificationId)}/read`, { method: 'PATCH' });
    } catch (err) {
        console.warn('[useNotifications] Mark as read error:', err);
    }
}

async function markAllAsRead() {
    notifications.value.forEach(n => { n.is_read = true; });
    unreadCount.value = 0;
    try {
        await fetch('/api/v1/notifications/mark-all-read', { method: 'POST' });
    } catch (err) {
        console.warn('[useNotifications] Mark all read error:', err);
    }
}

async function deleteNotification(notificationId) {
    const wasUnread = notifications.value.some(n => (n.id === notificationId || n.notification_id === notificationId) && !n.is_read);
    notifications.value = notifications.value.filter(n => n.id !== notificationId && n.notification_id !== notificationId);
    if (wasUnread) {
        unreadCount.value = Math.max(0, unreadCount.value - 1);
    }
    try {
        await fetch(`/api/v1/notifications/${encodeURIComponent(notificationId)}`, { method: 'DELETE' });
    } catch (err) {
        console.warn('[useNotifications] Delete notification error:', err);
    }
}

async function clearAll() {
    notifications.value = [];
    unreadCount.value = 0;
    try {
        await fetch('/api/v1/notifications/clear-all', { method: 'POST' });
    } catch (err) {
        console.warn('[useNotifications] Clear all error:', err);
    }
}

function showToast(message, type = 'info', durationMs = 4000) {
    const id = Date.now() + Math.random().toString(36).substring(2, 7);
    toasts.value.push({ id, message, type });
    setTimeout(() => {
        toasts.value = toasts.value.filter(t => t.id !== id);
    }, durationMs);
}

function initNotificationPolling(intervalMs = 30000) {
    fetchNotifications();
    if (!pollingInterval && typeof window !== 'undefined') {
        pollingInterval = setInterval(fetchNotifications, intervalMs);
    }
}

export function useNotifications() {
    return {
        notifications,
        unreadCount,
        loading,
        isNotifOpen,
        toasts,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
        showToast,
        initNotificationPolling
    };
}

