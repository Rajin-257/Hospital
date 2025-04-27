// Appointment page functionality
document.addEventListener('DOMContentLoaded', function() {
    // Handle patient modal opening
    const patientModals = document.querySelectorAll('[id^="patientModal"]');
    
    patientModals.forEach(modal => {
        modal.addEventListener('shown.bs.modal', function() {
            const patientId = this.id.replace('patientModal', '');
            loadPatientHistory(patientId, this);
        });
    });
    
    // Function to load patient appointment history
    function loadPatientHistory(patientId, modalElement) {
        const historyPlaceholder = modalElement.querySelector('.patient-history-placeholder');
        
        // Make an AJAX request to fetch patient appointment history
        fetch(`/api/patients/${patientId}/appointments`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Create appointment history HTML
                let historyHtml = '';
                
                if (data.appointments && data.appointments.length > 0) {
                    historyHtml = '<div class="table-responsive"><table class="table table-sm">';
                    historyHtml += '<thead><tr><th>Date</th><th>Doctor</th><th>Status</th></tr></thead><tbody>';
                    
                    data.appointments.forEach(apt => {
                        const date = new Date(apt.appointmentDate).toLocaleDateString();
                        const statusClass = apt.status === 'completed' ? 'bg-success' : 
                                           apt.status === 'scheduled' ? 'bg-warning' : 
                                           apt.status === 'cancelled' ? 'bg-danger' : 'bg-secondary';
                        
                        historyHtml += `<tr>
                            <td>${date} ${apt.appointmentTime}</td>
                            <td>Dr. ${apt.doctor.firstName} ${apt.doctor.lastName}</td>
                            <td><span class="badge ${statusClass}">${apt.status}</span></td>
                        </tr>`;
                    });
                    
                    historyHtml += '</tbody></table></div>';
                } else {
                    historyHtml = '<div class="text-center py-3"><p>No appointment history found</p></div>';
                }
                
                // Replace placeholder with history
                historyPlaceholder.innerHTML = historyHtml;
            })
            .catch(error => {
                console.error('Error fetching patient history:', error);
                historyPlaceholder.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-circle me-2"></i>
                        Error loading appointment history. Please try again.
                    </div>
                `;
            });
    }
    
    // Handle status update modals
    const statusModals = document.querySelectorAll('[id^="statusModal"]');
    statusModals.forEach(modal => {
        const statusSelect = modal.querySelector('select[name="status"]');
        const modalHeader = modal.querySelector('.modal-header');
        
        if (statusSelect) {
            // Change modal header color based on selected status
            statusSelect.addEventListener('change', function() {
                // Remove all previous background classes
                modalHeader.classList.remove('bg-primary', 'bg-success', 'bg-danger', 'bg-secondary');
                
                // Add appropriate class based on status
                switch(this.value) {
                    case 'completed':
                        modalHeader.classList.add('bg-success');
                        break;
                    case 'cancelled':
                        modalHeader.classList.add('bg-danger');
                        break;
                    case 'no-show':
                        modalHeader.classList.add('bg-secondary');
                        break;
                    default:
                        modalHeader.classList.add('bg-primary');
                }
            });
        }
    });
}); 