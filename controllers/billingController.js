// billingController.js
const Billing = require('../models/Billing');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const LabTest = require('../models/LabTest');
const Cabin = require('../models/Cabin');
const Doctor = require('../models/Doctor');
const { Op } = require('sequelize');

// Generate invoice number
const generateInvoiceNumber = async () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  
  // Get count of invoices for this month to create sequential number
  const count = await Billing.count({
    where: {
      createdAt: {
        [Op.gte]: new Date(date.getFullYear(), date.getMonth(), 1)
      }
    }
  });
  
  const sequence = (count + 1).toString().padStart(4, '0');
  return `INV${year}${month}${sequence}`;
};

// Show create billing form
exports.showCreateBillingForm = async (req, res) => {
  try {
    const { patientId } = req.query;
    let patient = null;
    let appointments = [];
    let labTests = [];
    let cabins = [];
    
    if (patientId) {
      // Fetch patient details
      patient = await Patient.findByPk(patientId, {
        attributes: ['id', 'patientId', 'firstName', 'lastName', 'contactNumber', 'email']
      });
      
      if (patient) {
        // Fetch pending appointments for this patient
        appointments = await Appointment.findAll({
          where: {
            patientId: patient.id,
            status: 'scheduled',
            invoice_status: 'pending'
          },
          include: [
            {
              model: Doctor,
              attributes: ['id', 'firstName', 'lastName', 'specialization', 'consultationFee']
            }
          ],
          order: [['appointmentDate', 'DESC']]
        });
        
        // Fetch pending lab tests for this patient
        labTests = await LabTest.findAll({
          where: {
            patientId: patient.id,
            status: ['requested', 'scheduled'],
            invoice_status: 'pending'
          },
          order: [['requestDate', 'DESC']]
        });
        
        // Fetch occupied cabins for this patient
        cabins = await Cabin.findAll({
          where: {
            patientId: patient.id,
            status: 'occupied',
            invoice_status: 'pending'
          },
          order: [['admissionDate', 'DESC']]
        });
      }
    }
    
    // Fetch all patients for the dropdown
    const patients = await Patient.findAll({
      attributes: ['id', 'patientId', 'firstName', 'lastName'],
      order: [['firstName', 'ASC'], ['lastName', 'ASC']]
    });
    
    res.render('billing/new', {
      pageTitle: 'Create New Invoice',
      patient,
      patients,
      appointments,
      labTests,
      cabins
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error loading billing form');
    res.redirect('/billing');
  }
};

// Create new billing
exports.createBilling = async (req, res) => {
  try {
    const { 
      patientId, 
      totalAmount, 
      discount,
      discountType,
      discountedAmount,
      paidAmount, 
      paymentMethod, 
      insuranceDetails, 
      services, 
      notes 
    } = req.body;
    
    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber();
    
    // Determine payment status
    let paymentStatus = 'pending';
    if (paidAmount >= discountedAmount) {
      paymentStatus = 'paid';
    } else if (paidAmount > 0) {
      paymentStatus = 'partial';
    }
    
    // Properly handle services data - Sequelize will handle JSON conversion
    // Don't stringify if it's already an object - Sequelize handles this
    const servicesData = services;
    
    const billing = await Billing.create({
      patientId,
      invoiceNumber,
      totalAmount,
      discount: discount || 0,
      discountType: discountType || 'fixed',
      discountedAmount: discountedAmount || totalAmount,
      paidAmount: paidAmount || 0,
      paymentStatus,
      paymentDate: paidAmount > 0 ? new Date() : null,
      paymentMethod: paidAmount > 0 ? paymentMethod : null,
      insuranceDetails: insuranceDetails, // Sequelize will handle JSON conversion
      services: servicesData,
      notes
    });
    
    // Update status of related services to "completed"
    if (services && typeof services === 'object') {
      // Process each service in the invoice
      for (const service of services) {
        // Check if service has a reference ID and type
        if (service.referenceId && service.type) {
          // Update Appointment invoice_status if this service is for an appointment
          if (service.type === 'appointment') {
            await Appointment.update(
              { invoice_status: 'invoiced' },
              { where: { id: service.referenceId } }
            );
          }
          
          // Update LabTest invoice_status if this service is for a lab test
          else if (service.type === 'labtest') {
            await LabTest.update(
              { invoice_status: 'invoiced' },
              { where: { id: service.referenceId } }
            );
          }
          
          // Update Cabin invoice_status if needed
          else if (service.type === 'cabin') {
            await Cabin.update(
              { 
                invoice_status: 'invoiced',
                // Don't change the cabin status or discharge the patient from here
              },
              { where: { id: service.referenceId } }
            );
          }
        }
      }
    }
    
    req.flash('success_msg', `Invoice ${invoiceNumber} created successfully`);
    res.redirect(`/billing/${billing.id}`);
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error creating invoice: ' + error.message);
    res.redirect('/billing/new');
  }
};

// Get all billings
exports.getAllBillings = async (req, res) => {
  try {
    const billings = await Billing.findAll({
      include: [
        {
          model: Patient,
          attributes: ['id', 'patientId', 'firstName', 'lastName']
        }
      ],
      order: [['invoiceDate', 'DESC']]
    });
    
    res.render('billing/index', {
      pageTitle: 'Billing Records',
      billings
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error retrieving billing records');
    res.redirect('/dashboard');
  }
};

// Get billing by ID
exports.getBillingById = async (req, res) => {
  try {
    const billing = await Billing.findByPk(req.params.id, {
      include: [
        {
          model: Patient,
          attributes: ['id', 'patientId', 'firstName', 'lastName', 'contactNumber', 'email']
        }
      ]
    });
    
    if (!billing) {
      req.flash('error_msg', 'Billing record not found');
      return res.redirect('/billing');
    }
    
    // No need to manually parse JSON fields - Sequelize already does this
    // These checks are just for safety in case of legacy data
    if (billing.services && typeof billing.services === 'string') {
      try {
        billing.services = JSON.parse(billing.services);
      } catch (e) {
        billing.services = [];
      }
    }
    
    // Ensure services is an array
    if (!Array.isArray(billing.services)) {
      billing.services = [];
    }
    
    if (billing.insuranceDetails && typeof billing.insuranceDetails === 'string') {
      try {
        billing.insuranceDetails = JSON.parse(billing.insuranceDetails);
      } catch (e) {
        billing.insuranceDetails = {};
      }
    }
    
    res.render('billing/show', {
      pageTitle: `Invoice: ${billing.invoiceNumber}`,
      billing
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error retrieving invoice details');
    res.redirect('/billing');
  }
};

// Show edit billing form
exports.showEditBillingForm = async (req, res) => {
  try {
    const billing = await Billing.findByPk(req.params.id, {
      include: [
        {
          model: Patient,
          attributes: ['id', 'patientId', 'firstName', 'lastName']
        }
      ]
    });
    
    if (!billing) {
      req.flash('error_msg', 'Billing record not found');
      return res.redirect('/billing');
    }
    
    res.render('billing/edit', {
      pageTitle: `Edit Invoice: ${billing.invoiceNumber}`,
      billing
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error loading invoice data');
    res.redirect('/billing');
  }
};

// Update billing
exports.updateBilling = async (req, res) => {
  try {
    const billing = await Billing.findByPk(req.params.id);
    
    if (!billing) {
      req.flash('error_msg', 'Billing record not found');
      return res.redirect('/billing');
    }
    
    const { paidAmount, paymentMethod } = req.body;
    
    // If payment is being updated
    if (paidAmount !== undefined) {
      // Determine payment status
      let paymentStatus = 'pending';
      if (paidAmount >= billing.totalAmount) {
        paymentStatus = 'paid';
      } else if (paidAmount > 0) {
        paymentStatus = 'partial';
      }
      
      req.body.paymentStatus = paymentStatus;
      
      // Set payment date if first payment
      if (billing.paidAmount === 0 && paidAmount > 0) {
        req.body.paymentDate = new Date();
      }
    }
    
    await billing.update(req.body);
    
    req.flash('success_msg', 'Invoice updated successfully');
    res.redirect(`/billing/${billing.id}`);
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error updating invoice: ' + error.message);
    res.redirect(`/billing/${req.params.id}/edit`);
  }
};

// Delete billing
exports.deleteBilling = async (req, res) => {
  try {
    const billing = await Billing.findByPk(req.params.id);
    
    if (!billing) {
      req.flash('error_msg', 'Billing record not found');
      return res.redirect('/billing');
    }
    
    await billing.destroy();
    
    req.flash('success_msg', 'Invoice deleted successfully');
    res.redirect('/billing');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error deleting invoice: ' + error.message);
    res.redirect('/billing');
  }
};

// Get patient's billings
exports.getPatientBillings = async (req, res) => {
  try {
    const { patientId } = req.params;
    const patient = await Patient.findByPk(patientId);
    
    if (!patient) {
      req.flash('error_msg', 'Patient not found');
      return res.redirect('/patients');
    }
    
    const billings = await Billing.findAll({
      where: { patientId },
      order: [['invoiceDate', 'DESC']]
    });
    
    res.render('billing/patient-billings', {
      pageTitle: `Billings: ${patient.firstName} ${patient.lastName}`,
      patient,
      billings
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error retrieving patient billing records');
    res.redirect(`/patients/${req.params.patientId}`);
  }
};

// Print invoice
exports.printInvoice = async (req, res) => {
  try {
    const billing = await Billing.findByPk(req.params.id, {
      include: [
        {
          model: Patient,
          attributes: ['id', 'patientId', 'firstName', 'lastName', 'contactNumber', 'email']
        }
      ]
    });
    
    if (!billing) {
      req.flash('error_msg', 'Billing record not found');
      return res.redirect('/billing');
    }
    
    // Make sure services is properly parsed from JSON if needed
    if (billing.services && typeof billing.services === 'string') {
      try {
        billing.services = JSON.parse(billing.services);
      } catch (e) {
        billing.services = [];
      }
    }
    
    // Ensure services is an array
    if (!Array.isArray(billing.services)) {
      billing.services = [];
    }
    
    // Same for insurance details
    if (billing.insuranceDetails && typeof billing.insuranceDetails === 'string') {
      try {
        billing.insuranceDetails = JSON.parse(billing.insuranceDetails);
      } catch (e) {
        billing.insuranceDetails = {};
      }
    }
    
    res.render('billing/print-invoice', {
      billing,
      layout: false // Render without the default layout for clean printing
    });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Error generating printable invoice');
    res.redirect(`/billing/${req.params.id}`);
  }
};