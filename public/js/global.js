/**
 * Global JavaScript functions for Hospital Management System
 */

// Fix modal issues across the application
document.addEventListener('DOMContentLoaded', function() {
    // Check for existing problems on page load
    setTimeout(cleanupModals, 500);

    // Properly initialize all modals
    const allModals = document.querySelectorAll('.modal');
    allModals.forEach(function(modal) {
        // Fix for uninitialized modals
        if (!bootstrap.Modal.getInstance(modal)) {
            new bootstrap.Modal(modal, {
                backdrop: true,
                keyboard: true,
                focus: true
            });
        }
        
        // Handle hidden event for each modal
        modal.addEventListener('hidden.bs.modal', function() {
            setTimeout(cleanupModals, 300);
        });
    });

    // Close button fix - ensure modals close properly
    document.querySelectorAll('.btn-close').forEach(function(closeBtn) {
        closeBtn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                const modalInstance = bootstrap.Modal.getInstance(modal);
                if (modalInstance) {
                    modalInstance.hide();
                }
            }
            setTimeout(cleanupModals, 300);
        });
    });

    // Fix for cancel buttons in modals
    document.querySelectorAll('.modal .btn-secondary, .modal [data-bs-dismiss="modal"]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            setTimeout(cleanupModals, 300);
        });
    });

    // Close modals when clicking outside
    document.addEventListener('click', function(event) {
        const openModals = document.querySelectorAll('.modal.show');
        openModals.forEach(function(modal) {
            if (event.target === modal) {
                setTimeout(cleanupModals, 300);
            }
        });
    });

    // Cleanup function to remove lingering backdrops and reset body styles
    window.cleanupModals = function() {
        const modalsVisible = document.querySelectorAll('.modal.show').length;
        if (modalsVisible === 0) {
            // Remove all backdrop elements
            document.querySelectorAll('.modal-backdrop').forEach(function(backdrop) {
                backdrop.remove();
            });
            
            // Reset body styles
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }
    };

    // Fix for forms within modals to prevent jumping
    document.querySelectorAll('.modal form').forEach(function(form) {
        form.addEventListener('submit', function() {
            // Store scroll position
            const scrollPos = window.scrollY;
            
            // Add a hidden input with scroll position
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'scrollPosition';
            input.value = scrollPos;
            this.appendChild(input);
        });
    });

    // Prevent page jump when opening modal
    document.querySelectorAll('[data-bs-toggle="modal"]').forEach(function(trigger) {
        trigger.addEventListener('click', function(e) {
            // Don't prevent default for Bootstrap's handler
            // e.preventDefault();
            const targetModalId = this.getAttribute('data-bs-target');
            
            // Ensure all other modals are fully closed first
            document.querySelectorAll('.modal.show').forEach(function(openModal) {
                if (openModal.id !== targetModalId.substring(1)) {
                    const modalInstance = bootstrap.Modal.getInstance(openModal);
                    if (modalInstance) {
                        modalInstance.hide();
                    }
                }
            });
            
            // Cleanup before opening new modal
            setTimeout(cleanupModals, 100);
        });
    });

    // Handle escape key globally
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            setTimeout(cleanupModals, 300);
        }
    });
}); 