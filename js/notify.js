// Shared toast-style notification used across auth pages.
function showNotification(message, type = 'success') {
    document.querySelectorAll('.auth-notification').forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = `auth-notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i>
            <span>${message}</span>
            <button class="close-notification">&times;</button>
        </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);

    notification.querySelector('.close-notification').addEventListener('click', () => {
        notification.remove();
    });
}
