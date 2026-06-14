// Applies window.APP_BRANDING (see branding-config.js) to the current page.
(function () {
    const b = window.APP_BRANDING || {};
    const displayName = b.orgName ? `${b.orgName} ${b.appName}` : b.appName;

    // This script is loaded in <head>, so head elements exist already.
    if (displayName) {
        document.title = document.title.replace('Faith Fast', displayName);
    }

    document.querySelectorAll('meta[name="apple-mobile-web-app-title"]').forEach(el => {
        el.setAttribute('content', displayName);
    });

    document.querySelectorAll('meta[name="theme-color"], meta[name="msapplication-TileColor"]').forEach(el => {
        el.setAttribute('content', b.themeColor);
    });

    // Body elements don't exist yet at this point - wait for the DOM.
    function applyToBody() {
        document.querySelectorAll('.app-name').forEach(el => {
            el.textContent = displayName;
        });

        document.querySelectorAll('.app-tagline').forEach(el => {
            el.textContent = b.tagline;
        });

        document.querySelectorAll('.app-logo-icon').forEach(el => {
            el.className = el.className.replace(/\bfa-[\w-]+/, b.logoIcon || 'fa-pray');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyToBody);
    } else {
        applyToBody();
    }
})();
