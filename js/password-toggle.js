// Adds show/hide functionality to any .toggle-password button paired with
// an input via data-target="<input id>".
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = document.getElementById(btn.dataset.target);
            if (!target) return;

            const showing = target.type === 'password';
            target.type = showing ? 'text' : 'password';

            const icon = btn.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-eye', !showing);
                icon.classList.toggle('fa-eye-slash', showing);
            }
            btn.setAttribute('aria-label', showing ? 'Hide password' : 'Show password');
        });
    });
});
