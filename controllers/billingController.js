const Billing = require('../models/Billing');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Test = require('../models/Test');
const Cabin = require('../models/Cabin');
const Appointment = require('../models/Appointment');
const CabinBooking = require('../models/CabinBooking');
const TestRequest = require('../models/TestRequest');
const { Op } = require('sequelize');

// Render billing page
exports.renderBillingPage = async (req, res) => {
  try {
    const patients = await Patient.findAll();
    const doctors = await Doctor.findAll();
    const tests = await Test.findAll();
    const cabins = await Cabin.findAll();
    
    // Get feature permissions from request
    const featurePermissions = req.featurePermissions || {};
    
    // Check feature visibility for current user
    const userRole = req.user.role;
    
    // For admin users, all features are visible regardless of permission settings
    let visibleFeatures;
    if (userRole === 'admin') {
      visibleFeatures = {
        scheduleAppointment: true,
        cabinAllocation: true,
        testRequisition: true
      };
    } else {
      visibleFeatures = {
        scheduleAppointment: isFeatureVisible(featurePermissions, 'Schedule Appointment', userRole),
        cabinAllocation: isFeatureVisible(featurePermissions, 'Cabin Allocation', userRole),
        testRequisition: isFeatureVisible(featurePermissions, 'Test Requisition', userRole)
      };
    }
    
    res.render('billing', {
      title: 'Billing',
      patients,
      doctors,
      tests,
      cabins,
      visibleFeatures
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

// Helper function to check if a feature is visible to the current user
function isFeatureVisible(permissionsMap, featureName, userRole) {
  // If no permissions map is available, default to visible
  if (!permissionsMap) return true;
  
  // Get the permission for the feature
  const permission = permissionsMap[featureName];
  
  // If permission doesn't exist, default to visible
  if (!permission) return true;
  
  // Check if the feature is visible and the user role is allowed
  return permission.isVisible && permission.roles.includes(userRole);
}

// Create new billing
exports.createBilling = async (req, res) => {
  try {
    const { 
      patientId, 
      totalAmount, 
      discountPercentage, 
      discountAmount, 
      netPayable, 
      paymentMethod, 
      paidAmount, 
      dueAmount,
      items,
      appointmentIds,
      cabinBookingIds,
      billdelivaridate
    } = req.body;
    
    // Validate total amount
    if (parseFloat(totalAmount) <= 0) {
      return res.status(400).json({ message: "Cannot create a bill with zero or negative amount" });
    }
    
    // Generate bill number
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    const latestBill = await Billing.findOne({
      order: [['id', 'DESC']]
    });
    
    let sequence = 1;
    if (latestBill) {
      const latestBillNumber = latestBill.billNumber;
      const latestSequence = parseInt(latestBillNumber.substring(latestBillNumber.length - 4));
      sequence = latestSequence + 1;
    }
    
    const billNumber = `BILL${dateStr}${sequence.toString().padStart(4, '0')}`;
    
    // Determine status - only 'paid' or 'due'
    let status;
    if (parseFloat(paidAmount) >= parseFloat(netPayable)) {
      status = 'paid';
    } else {
      status = 'due';
    }
    
    const billing = await Billing.create({
      billNumber,
      PatientId: patientId,
      billDate: today,
      billdelivaridate: billdelivaridate || null,
      totalAmount,
      discountPercentage,
      discountAmount,
      netPayable,
      paymentMethod,
      paidAmount,
      dueAmount,
      status,
      items: JSON.parse(items)
    });
    
    // If appointment IDs are provided, mark them as billed
    if (appointmentIds && appointmentIds.length > 0) {
      const appointmentIdsArray = JSON.parse(appointmentIds);
      if (appointmentIdsArray.length > 0) {
        await Appointment.update(
          { billingStatus: 'billed' },
          { 
            where: { 
              id: { 
                [Op.in]: appointmentIdsArray 
              } 
            } 
          }
        );
      }
    }
    
    // If cabin booking IDs are provided, mark them as billed
    if (cabinBookingIds && cabinBookingIds.length > 0) {
      const cabinBookingIdsArray = JSON.parse(cabinBookingIds);
      if (cabinBookingIdsArray.length > 0) {
        await CabinBooking.update(
          { billingStatus: 'billed' },
          { 
            where: { 
              id: { 
                [Op.in]: cabinBookingIdsArray 
              } 
            } 
          }
        );
      }
    }
    
    // Create test requests for test items in the billing
    const billingItems = JSON.parse(items);
    const testItems = billingItems.filter(item => item.type === 'test');
    
    if (testItems.length > 0) {
      const testRequests = testItems.map(test => {
        // Process delivery date if it exists
        let deliveryDate = null;
        if (test.deliveryDate && test.deliveryDate.trim() !== '') {
          deliveryDate = new Date(test.deliveryDate);
          
          // Check if date is valid
          if (isNaN(deliveryDate.getTime())) {
            deliveryDate = null;
          }
        }
        
        return {
          PatientId: patientId,
          TestId: test.id,
          priority: test.priority || 'Normal',
          requestDate: today,
          status: 'Requested',
          billingStatus: 'billed',
          deliveryOption: test.deliveryOption || 'Not Collected',
          deliveryDate: deliveryDate
        };
      });
      
      await TestRequest.bulkCreate(testRequests);
    }
    
    const fullBilling = await Billing.findByPk(billing.id, {
      include: [
        { model: Patient }
      ]
    });
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(201).json(fullBilling);
    }
    
    res.redirect(`/billing/receipt/${billing.id}`);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get billing by ID
exports.getBilling = async (req, res) => {
  try {
    const billing = await Billing.findByPk(req.params.id, {
      include: [
        { model: Patient }
      ]
    });
    
    if (!billing) {
      return res.status(404).json({ message: 'Billing not found' });
    }
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json(billing);
    }
    
    res.render('billing_receipt', {
      title: 'Billing Receipt',
      billing
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get billings by patient
exports.getBillingsByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const billings = await Billing.findAll({
      where: { PatientId: patientId },
      order: [['billDate', 'DESC']]
    });
    
    res.json(billings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Process payment
exports.processPayment = async (req, res) => {
  try {
    const { paidAmount, paymentMethod } = req.body;
    
    let billing = await Billing.findByPk(req.params.id);
    
    if (!billing) {
      return res.status(404).json({ message: 'Billing not found' });
    }
    
    const newPaidAmount = parseFloat(billing.paidAmount) + parseFloat(paidAmount);
    const newDueAmount = parseFloat(billing.netPayable) - newPaidAmount;
    
    // Determine status - only 'paid' or 'due'
    let status;
    if (newPaidAmount >= parseFloat(billing.netPayable)) {
      status = 'paid';
    } else {
      status = 'due';
    }
    
    billing = await billing.update({
      paidAmount: newPaidAmount,
      dueAmount: newDueAmount,
      paymentMethod,
      status
    });
    
    res.json(billing);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get unbilled appointments by patient
exports.getUnbilledAppointments = async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const appointments = await Appointment.findAll({
      where: { 
        PatientId: patientId,
        billingStatus: 'not_billed',
        status: {
          [Op.ne]: 'cancelled'
        }
      },
      include: [
        { model: Doctor }
      ],
      order: [['appointmentDate', 'DESC']]
    });
    
    res.json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Update appointment billing status
exports.updateAppointmentBillingStatus = async (req, res) => {
  try {
    const { appointmentIds } = req.body;
    
    if (!appointmentIds || !appointmentIds.length) {
      return res.status(400).json({ message: 'No appointments provided' });
    }
    
    await Appointment.update(
      { billingStatus: 'billed' },
      { 
        where: { 
          id: { 
            [Op.in]: appointmentIds 
          } 
        } 
      }
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};