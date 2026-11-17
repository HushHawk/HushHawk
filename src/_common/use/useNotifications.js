import { ref } from 'vue';

// Singleton state shared by the workspace headers and alert dropdown.
const notifications = ref([]);
const unreadCount = ref(0);
const loading = ref(false);
const error = ref('');
const isNotifOpen = ref(false);
const toasts = ref([]);
const endpoint = '/api/v1/notifications';
const refreshInterval = 5000;

let pollingInterval;
let pendingRefresh;

function fetchNotifications() {
    if (pendingRefresh) return pendingRefresh;
    loading.value = true;
    pendingRefresh = (async () => {
        try {
            const response = await fetch(endpoint, { cache: 'no-store' });
            if (!response.ok) throw new Error('Notification fetch failed');
            const data = await response.json();
            if (!Array.isArray(data.notifications)) throw new Error('Invalid notification response');
            notifications.value = data.notifications;
            unreadCount.value = Number(data.unread_count ?? 0);
            error.value = '';
        } catch {
            error.value = 'Could not refresh notifications.';
        } finally {
            loading.value = false;
            pendingRefresh = undefined;
        }
    })();
    return pendingRefresh;
}

async function updateNotifications(path, method) {
    try {
        const response = await fetch(endpoint + path, { method, keepalive: true });
        if (!response.ok) throw new Error('Notification update failed');
        // A refresh started before this write may still contain the old values.
        await pendingRefresh;
        await fetchNotifications();
    } catch {
        error.value = 'Could not update notifications.';
    }
}

const markAsRead = id => updateNotifications(`/${encodeURIComponent(id)}/read`, 'PATCH');
const markAllAsRead = () => updateNotifications('/mark-all-read', 'POST');
const deleteNotification = id => updateNotifications(`/${encodeURIComponent(id)}`, 'DELETE');
const clearAll = () => updateNotifications('/clear-all', 'POST');

function showToast(message, type = 'info', durationMs = 4000) {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : 'notif-' + Date.now();
    toasts.value.push({ id, message, type });
    setTimeout(() => {
        toasts.value = toasts.value.filter(t => t.id !== id);
    }, durationMs);
}

function refreshVisiblePage() {
    if (!document.hidden) fetchNotifications();
}

function initNotificationPolling() {
    if (typeof window === 'undefined' || pollingInterval !== undefined) return;
    pollingInterval = window.setInterval(refreshVisiblePage, refreshInterval);
    document.addEventListener('visibilitychange', refreshVisiblePage);
    window.addEventListener('focus', refreshVisiblePage);
    fetchNotifications();
}

export function useNotifications() {
    return {
        notifications,
        unreadCount,
        loading,
        error,
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

