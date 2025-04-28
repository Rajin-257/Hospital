// Initialize Select2 for all standard selects
function initializeSelects() {
    $('.form-select:not(.no-select2)').each(function() {
        let config = {
            theme: 'bootstrap-5',
            width: '100%'
        };
        
        // Add placeholder if data attribute exists
        if ($(this).data('placeholder')) {
            config.placeholder = $(this).data('placeholder');
            config.allowClear = true;
        }
        
        // Disable search for small selects
        if ($(this).hasClass('no-search')) {
            config.minimumResultsForSearch = Infinity;
        }
        
        $(this).select2(config);
    });
}

// Format currency
function formatCurrency(amount) {
    return '$' + parseFloat(amount).toFixed(2);
}

// Format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Show toast notification
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    
    if (!toastContainer) {
        // Create toast container if it doesn't exist
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(container);
    }
    
    const toastId = 'toast-' + Date.now();
    const backgroundColor = type === 'success' ? '#4caf50' : 
                          type === 'error' ? '#f44336' : 
                          type === 'warning' ? '#ff9800' : '#2196f3';
    
    const toastHtml = `
        <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header" style="background-color: ${backgroundColor}; color: white;">
                <strong class="me-auto">${type.charAt(0).toUpperCase() + type.slice(1)}</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;
    
    $('#toast-container').append(toastHtml);
    
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { autohide: true, delay: 3000 });
    toast.show();
    
    // Remove toast after it's hidden
    toastElement.addEventListener('hidden.bs.toast', function() {
        toastElement.remove();
    });
}

// Confirm dialog
function confirmAction(message, callback) {
    if (confirm(message)) {
        callback();
    }
}

// Document ready
$(document).ready(function() {
    initializeSelects();
    
    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    });
    
    // Add confirm dialog to delete buttons
    $(document).on('click', '.btn-delete', function(e) {
        e.preventDefault();
        
        const url = $(this).attr('href') || $(this).data('url');
        const itemName = $(this).data('name') || 'item';
        
        confirmAction(`Are you sure you want to delete this ${itemName}?`, function() {
            $.ajax({
                url: url,
                type: 'DELETE',
                success: function(result) {
                    showToast(result.message || `${itemName} deleted successfully.`);
                    // Reload page or remove element
                    if (window.location.reload) {
                        window.location.reload();
                    }
                },
                error: function(xhr) {
                    showToast(xhr.responseJSON?.message || 'An error occurred', 'error');
                }
            });
        });
    });
});