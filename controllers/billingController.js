const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { ZipArchive } = require('archiver');
const Billing = require('../models/Billing');
const Setting = require('../models/Setting');
const medicalReportController = require('./medicalReportController');
const { launchPdfBrowser } = require('../utils/reportPdf');
const { generateAiPortrait } = require('../utils/openaiPortrait');
const {
  enqueueBulkAiPortraits,
  getBatchStatus,
  generateAiPortraitForBilling
} = require('../utils/aiPortraitQueue');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Test = require('../models/Test');
const Cabin = require('../models/Cabin');
const Appointment = require('../models/Appointment');
const CabinBooking = require('../models/CabinBooking');
const TestRequest = require('../models/TestRequest');
const DoctorCommission = require('../models/DoctorCommission');
const MarketingCommission = require('../models/MarketingCommission');
const MedicalReport = require('../models/MedicalReport');
const User = require('../models/User');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { buildPatientAccessWhere } = require('./patientController');

const BILLING_PHOTOS_DIR = path.join(__dirname, '../public/uploads/billing_photos');

function companionJpgPath(storedPath) {
  if (!storedPath) return null;
  if (path.extname(storedPath).toLowerCase() !== '.png') return null;
  return storedPath.replace(/\.png$/i, '.jpg');
}

function saveAiPortraitFiles(billingId, portraitBuffers) {
  const timestamp = Date.now();
  const pngFilename = `ai-${billingId}-${timestamp}.png`;
  const jpgFilename = `ai-${billingId}-${timestamp}.jpg`;
  fs.writeFileSync(path.join(BILLING_PHOTOS_DIR, pngFilename), portraitBuffers.png);
  fs.writeFileSync(path.join(BILLING_PHOTOS_DIR, jpgFilename), portraitBuffers.jpg);
  return {
    imageUrl: `/uploads/billing_photos/${pngFilename}`,
    imageUrlJpg: `/uploads/billing_photos/${jpgFilename}`
  };
}

async function persistBillingPhotoAsPng(sourcePath, billingId, prefix) {
  const timestamp = Date.now();
  const pngFilename = `${prefix}-${billingId}-${timestamp}.png`;
  const jpgFilename = `${prefix}-${billingId}-${timestamp}.jpg`;
  const pngPath = path.join(BILLING_PHOTOS_DIR, pngFilename);
  const jpgPath = path.join(BILLING_PHOTOS_DIR, jpgFilename);
  const pipeline = sharp(sourcePath);
  await Promise.all([
    pipeline.clone().png().toFile(pngPath),
    pipeline.clone().jpeg({ quality: 92 }).toFile(jpgPath)
  ]);
  if (fs.existsSync(sourcePath) && path.resolve(sourcePath) !== path.resolve(pngPath)) {
    try {
      fs.unlinkSync(sourcePath);
    } catch (unlinkErr) {
      console.error('Could not remove temp billing photo:', unlinkErr);
    }
  }
  return `/uploads/billing_photos/${pngFilename}`;
}

async function persistBillingDocumentFile(sourcePath, billingId, prefix, originalName) {
  const ext = path.extname(originalName || sourcePath).toLowerCase();
  if (ext === '.pdf') {
    const filename = `${prefix}-${billingId}-${Date.now()}.pdf`;
    const outputPath = path.join(BILLING_PHOTOS_DIR, filename);
    fs.copyFileSync(sourcePath, outputPath);
    if (fs.existsSync(sourcePath) && path.resolve(sourcePath) !== path.resolve(outputPath)) {
      try {
        fs.unlinkSync(sourcePath);
      } catch (unlinkErr) {
        console.error(`Could not remove temp ${prefix} file:`, unlinkErr);
      }
    }
    return `/uploads/billing_photos/${filename}`;
  }
  return persistBillingPhotoAsPng(sourcePath, billingId, prefix);
}

async function persistBillingPassportFile(sourcePath, billingId, originalName) {
  return persistBillingDocumentFile(sourcePath, billingId, 'passport', originalName);
}

async function persistBillingNidFile(sourcePath, billingId, originalName) {
  return persistBillingDocumentFile(sourcePath, billingId, 'nid', originalName);
}

function buildBillingAccessWhere(req) {
  if (req.user?.role === 'receptionist') {
    return { createdBy: req.user.id };
  }
  if (req.user?.role === 'laboratorist') {
    return { assignedLabId: req.user.id };
  }
  return {};
}

function escapeCsvValue(value) {
  const str = value == null ? '' : String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatInvoiceListDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString('en-GB');
}

function parseSearchTerms(query) {
  return String(query || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function likePattern(term) {
  return { [Op.like]: `%${term}%` };
}

function buildFieldOrConditions(terms, fieldName) {
  if (!terms.length) {
    return null;
  }
  if (terms.length === 1) {
    return { [fieldName]: likePattern(terms[0]) };
  }
  return {
    [Op.or]: terms.map((term) => ({ [fieldName]: likePattern(term) }))
  };
}

async function fetchFilteredInvoices(req) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const {
    startDate = todayStr,
    endDate = todayStr,
    searchType = 'all',
    searchQuery = '',
    status = 'all',
    createdBy = ''
  } = req.query;

  const fromDate = startDate || todayStr;
  const toDate = endDate || todayStr;
  const selectedCreatedBy = String(createdBy || '').trim();
  const canFilterByCreator = ['softadmin', 'admin'].includes(req.user?.role);

  const whereClause = {
    billDate: {
      [Op.between]: [fromDate, toDate]
    },
    ...buildBillingAccessWhere(req)
  };

  if (canFilterByCreator && selectedCreatedBy) {
    const creatorId = parseInt(selectedCreatedBy, 10);
    if (!Number.isNaN(creatorId)) {
      whereClause.createdBy = creatorId;
    }
  }

  if (status === 'Fit' || status === 'Unfit' || status === 'Held UP' || status === 'RUNNING') {
    whereClause['$MedicalReport.status$'] = status;
  }

  const patientWhereClause = {};
  const term = String(searchQuery || '').trim();
  const terms = parseSearchTerms(term);

  if (terms.length && searchType !== 'all') {
    switch (searchType) {
      case 'billNumber': {
        const billNumberFilter = buildFieldOrConditions(terms, 'billNumber');
        if (billNumberFilter) {
          Object.assign(whereClause, billNumberFilter);
        }
        break;
      }
      case 'patientId': {
        const patientIdFilter = buildFieldOrConditions(terms, 'patientId');
        if (patientIdFilter) {
          Object.assign(patientWhereClause, patientIdFilter);
        }
        break;
      }
      case 'patientName': {
        const patientNameFilter = buildFieldOrConditions(terms, 'name');
        if (patientNameFilter) {
          Object.assign(patientWhereClause, patientNameFilter);
        }
        break;
      }
      case 'phone': {
        const phoneFilter = buildFieldOrConditions(terms, 'phone');
        if (phoneFilter) {
          Object.assign(patientWhereClause, phoneFilter);
        }
        break;
      }
      case 'passport': {
        const passportFilter = buildFieldOrConditions(terms, 'nidPassportNo');
        if (passportFilter) {
          Object.assign(patientWhereClause, passportFilter);
        }
        break;
      }
      default:
        break;
    }
  } else if (terms.length) {
    whereClause[Op.or] = terms.flatMap((searchTerm) => [
      { billNumber: likePattern(searchTerm) },
      { '$Patient.name$': likePattern(searchTerm) },
      { '$Patient.patientId$': likePattern(searchTerm) },
      { '$Patient.phone$': likePattern(searchTerm) },
      { '$Patient.nidPassportNo$': likePattern(searchTerm) }
    ]);
  }

  let bills = await Billing.findAll({
    where: whereClause,
    include: [
      {
        model: Patient,
        where: Object.keys(patientWhereClause).length > 0 ? patientWhereClause : undefined
      },
      { model: MedicalReport, required: false },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'username'],
        required: false
      },
      {
        model: User,
        as: 'assignedLab',
        attributes: ['id', 'username'],
        required: false
      }
    ],
    subQuery: false,
    order: [['billDate', 'DESC'], ['createdAt', 'DESC']]
  });

  if (status === 'none') {
    bills = bills.filter((bill) => !bill.MedicalReport);
  }

  const creators = canFilterByCreator
    ? await User.findAll({
        where: { isActive: true },
        attributes: ['id', 'username'],
        order: [['username', 'ASC']]
      })
    : [];

  return {
    bills,
    creators,
    canFilterByCreator,
    filters: {
      startDate: fromDate,
      endDate: toDate,
      searchType,
      searchQuery: term,
      status,
      createdBy: selectedCreatedBy
    },
    totalRecords: bills.length
  };
}

// Render billing page
exports.renderBillingPage = async (req, res) => {
  try {
    const patients = await Patient.findAll({
      where: buildPatientAccessWhere(req),
      order: [['name', 'ASC']]
    });
    const doctors = await Doctor.findAll();
    const tests = await Test.findAll();
    const cabins = await Cabin.findAll();
    
    // Get marketing managers (users with 'marketing' role)
    const marketingManagers = await User.findAll({
      where: {
        role: 'marketing',
        isActive: true
      },
      attributes: ['id', 'username']
    });
    
    // Get feature permissions from request
    const featurePermissions = req.featurePermissions || {};
    
    // Check feature visibility for current user
    const userRole = req.user.role;
    
    // For admin users, all features are visible regardless of permission settings
    let visibleFeatures;
    if (userRole === 'softadmin') {
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
      marketingManagers,
      visibleFeatures
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

exports.renderTodayInvoiceList = async (req, res) => {
  try {
    const { bills, creators, canFilterByCreator, filters, totalRecords } = await fetchFilteredInvoices(req);

    const canAssign = ['softadmin', 'admin'].includes(req.user.role);
    const laboratorists = canAssign
      ? await User.findAll({
          where: { role: 'laboratorist', isActive: true },
          attributes: ['id', 'username'],
          order: [['username', 'ASC']]
        })
      : [];

    res.render('billing_invoice_list', {
      title: 'Invoice List',
      bills,
      creators,
      canFilterByCreator,
      filters,
      totalRecords,
      currentUserRole: req.user.role,
      canAssign,
      laboratorists
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load invoices'
    });
  }
};

// Assign / unassign an invoice to a laboratorist (softadmin + admin only)
exports.assignInvoiceToLab = async (req, res) => {
  try {
    if (!['softadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only admin users can assign invoices' });
    }

    const billing = await Billing.findByPk(req.params.id);
    if (!billing) return res.status(404).json({ message: 'Invoice not found' });

    const { labUserId } = req.body;

    if (!labUserId || labUserId === 'none') {
      await billing.update({ assignedLabId: null });
      return res.json({ success: true, message: 'Assignment removed', assignedLabId: null, assignedLabName: null });
    }

    const labUser = await User.findOne({
      where: { id: labUserId, role: 'laboratorist', isActive: true },
      attributes: ['id', 'username']
    });
    if (!labUser) return res.status(404).json({ message: 'Laboratorist not found or inactive' });

    await billing.update({ assignedLabId: labUser.id });
    res.json({ success: true, message: 'Invoice assigned successfully', assignedLabId: labUser.id, assignedLabName: labUser.username });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.assignInvoicesToLab = async (req, res) => {
  try {
    if (!['softadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only admin users can assign invoices' });
    }

    const rawIds = req.body.ids;
    const ids = [...new Set(
      (Array.isArray(rawIds) ? rawIds : String(rawIds || '').split(','))
        .map((id) => parseInt(id, 10))
        .filter((id) => !Number.isNaN(id))
    )];

    if (!ids.length) {
      return res.status(400).json({ message: 'Select at least one invoice' });
    }

    const { labUserId } = req.body;
    let assignedLabId = null;
    let assignedLabName = null;

    if (!labUserId || labUserId === 'none') {
      assignedLabId = null;
      assignedLabName = null;
    } else {
      const labUser = await User.findOne({
        where: { id: labUserId, role: 'laboratorist', isActive: true },
        attributes: ['id', 'username']
      });
      if (!labUser) return res.status(404).json({ message: 'Laboratorist not found or inactive' });
      assignedLabId = labUser.id;
      assignedLabName = labUser.username;
    }

    const [updatedCount] = await Billing.update(
      { assignedLabId },
      { where: { id: { [Op.in]: ids } } }
    );

    if (!updatedCount) {
      return res.status(404).json({ message: 'No invoices found for the selected items' });
    }

    const message = assignedLabId
      ? `${updatedCount} invoice(s) assigned to ${assignedLabName}`
      : `Assignment removed from ${updatedCount} invoice(s)`;

    res.json({
      success: true,
      message,
      assignedLabId,
      assignedLabName,
      updatedCount,
      ids
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Re-upload taken photo from the invoice list
exports.reuploadTakenPhoto = async (req, res) => {
  try {
    const billing = await Billing.findOne({
      where: { id: req.params.id, ...buildBillingAccessWhere(req) }
    });
    if (!billing) return res.status(404).json({ message: 'Billing not found' });

    const uploadedFile = req.file;
    if (!uploadedFile) return res.status(400).json({ message: 'No photo uploaded' });

    // Remove old takenPhoto file if it exists
    if (billing.takenPhoto) {
      const oldPath = path.join(__dirname, '../public', billing.takenPhoto);
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch (_) {}
      }
    }

    const newPath = await persistBillingPhotoAsPng(uploadedFile.path, billing.id, 'taken');

    // Also update patientPhoto if it was previously the same as takenPhoto,
    // or if patientPhoto is not separately set
    const updates = { takenPhoto: newPath };
    if (!billing.patientPhoto || billing.patientPhoto === billing.takenPhoto) {
      updates.patientPhoto = newPath;
    }

    await billing.update(updates);

    res.json({ success: true, takenPhoto: newPath, message: 'Taken photo updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Re-upload passport photo (PNG or PDF) from the invoice list
exports.reuploadPassportPhoto = async (req, res) => {
  try {
    const billing = await Billing.findOne({
      where: { id: req.params.id, ...buildBillingAccessWhere(req) }
    });
    if (!billing) return res.status(404).json({ message: 'Billing not found' });

    const uploadedFile = req.file;
    if (!uploadedFile) return res.status(400).json({ message: 'No file uploaded' });

    // Remove old passportPhoto file if it exists
    if (billing.passportPhoto) {
      const oldPath = path.join(__dirname, '../public', billing.passportPhoto);
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch (_) {}
      }
    }

    const newPath = await persistBillingPassportFile(uploadedFile.path, billing.id, uploadedFile.originalname);
    await billing.update({ passportPhoto: newPath });

    res.json({ success: true, passportPhoto: newPath, message: 'Passport updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Re-upload NID photo (PNG or PDF) from the invoice list
exports.reuploadNidPhoto = async (req, res) => {
  try {
    const billing = await Billing.findOne({
      where: { id: req.params.id, ...buildBillingAccessWhere(req) }
    });
    if (!billing) return res.status(404).json({ message: 'Billing not found' });

    const uploadedFile = req.file;
    if (!uploadedFile) return res.status(400).json({ message: 'No file uploaded' });

    if (billing.nidPhoto) {
      const oldPath = path.join(__dirname, '../public', billing.nidPhoto);
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch (_) {}
      }
    }

    const newPath = await persistBillingNidFile(uploadedFile.path, billing.id, uploadedFile.originalname);
    await billing.update({ nidPhoto: newPath });

    res.json({ success: true, nidPhoto: newPath, message: 'NID picture updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Generate AI portrait for a billing from the invoice list (uses the laboratorist's own bg + prompt)
exports.generateAiForInvoice = async (req, res) => {
  try {
    const billing = await Billing.findOne({
      where: { id: req.params.id, ...buildBillingAccessWhere(req) }
    });
    if (!billing) return res.status(404).json({ message: 'Billing not found' });
    if (!billing.takenPhoto) return res.status(400).json({ message: 'No taken photo available for this billing' });

    const currentUser = await User.findByPk(req.user.id, {
      attributes: ['id', 'hospitalBg', 'aiPrompt']
    });
    if (!currentUser) return res.status(404).json({ message: 'User not found' });

    const { imageUrl, imageUrlJpg } = await generateAiPortraitForBilling(billing, currentUser);

    res.json({ success: true, imageUrl, imageUrlJpg, message: 'AI portrait generated and saved' });
  } catch (error) {
    console.error('AI portrait (invoice list) error:', error);
    res.status(500).json({ message: error.message || 'Failed to generate AI portrait' });
  }
};

exports.generateAiBulkForInvoices = async (req, res) => {
  try {
    const rawIds = req.body.ids ?? req.query.ids;
    const ids = (Array.isArray(rawIds) ? rawIds : String(rawIds || '').split(','))
      .map((id) => parseInt(id, 10))
      .filter((id) => !Number.isNaN(id));

    if (!ids.length) {
      return res.status(400).json({ message: 'Select at least one invoice' });
    }

    const accessibleBills = await Billing.findAll({
      where: {
        id: { [Op.in]: ids },
        ...buildBillingAccessWhere(req)
      },
      attributes: ['id']
    });
    const accessibleIds = accessibleBills.map((bill) => bill.id);

    if (!accessibleIds.length) {
      return res.status(404).json({ message: 'No accessible invoices found for the selected items' });
    }

    const result = await enqueueBulkAiPortraits(accessibleIds, req.user.id);

    res.status(202).json({
      success: true,
      batchId: result.batchId,
      queued: result.queued,
      skipped: result.skipped,
      alreadyHasAi: result.alreadyHasAi || 0,
      total: result.total,
      message: result.queued > 0
        ? `AI portrait generation started for ${result.queued} invoice(s) in the background. You can close this page — processing will continue on the server.`
        : result.alreadyHasAi > 0
          ? `No new AI portraits queued. ${result.alreadyHasAi} selected invoice(s) already have an AI portrait.`
          : 'No invoices were queued. Selected invoices need a taken photo before AI generation.'
    });
  } catch (error) {
    console.error('Bulk AI portrait queue error:', error);
    res.status(500).json({ message: error.message || 'Failed to start AI portrait generation' });
  }
};

exports.getAiBulkStatus = async (req, res) => {
  try {
    const status = await getBatchStatus(req.params.batchId, req.user.id);
    if (!status) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    res.json({ success: true, ...status });
  } catch (error) {
    console.error('Bulk AI portrait status error:', error);
    res.status(500).json({ message: error.message || 'Failed to load batch status' });
  }
};

exports.downloadTodayInvoiceList = async (req, res) => {
  try {
    const { bills, filters } = await fetchFilteredInvoices(req);
    const headers = [
      'SL',
      'Report Date',
      'Invoice No.',
      'Passport No.',
      'Patient Name',
      'Status',
      'Created By',
      'Created Date'
    ];

    const rows = bills.map((bill, index) => [
      index + 1,
      bill.MedicalReport ? formatInvoiceListDate(bill.MedicalReport.reportDate) : '',
      bill.billNumber,
      bill.Patient && bill.Patient.nidPassportNo ? bill.Patient.nidPassportNo : '',
      bill.Patient ? bill.Patient.name : 'Unknown',
      bill.MedicalReport && bill.MedicalReport.status ? bill.MedicalReport.status : '',
      bill.creator ? bill.creator.username : '',
      formatInvoiceListDate(bill.createdAt)
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsvValue).join(','))
      .join('\r\n');

    const filename = `invoices-${filters.startDate}-to-${filters.endDate}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv);
  } catch (error) {
    console.error(error);
    res.status(500).send('Failed to download invoices');
  }
};

exports.downloadPassportPhoto = async (req, res) => {
  try {
    const billing = await Billing.findOne({
      where: {
        id: req.params.id,
        ...buildBillingAccessWhere(req)
      },
      include: [{ model: Patient }]
    });

    if (!billing || !billing.passportPhoto) {
      return res.status(404).send('Passport picture not found');
    }

    const relativePath = billing.passportPhoto.replace(/^\//, '');
    const filePath = path.join(__dirname, '../public', relativePath);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Passport picture file not found');
    }

    const ext = path.extname(filePath) || '.png';
    const passportNo = (billing.Patient?.nidPassportNo || 'passport').replace(/[^\w.-]+/g, '_');
    const billNumber = String(billing.billNumber || billing.id).replace(/[^\w.-]+/g, '_');
    const filename = `${passportNo}-${billNumber}${ext}`;

    res.download(filePath, filename);
  } catch (error) {
    console.error(error);
    res.status(500).send('Failed to download passport picture');
  }
};

exports.downloadNidPhoto = async (req, res) => {
  try {
    const billing = await Billing.findOne({
      where: {
        id: req.params.id,
        ...buildBillingAccessWhere(req)
      },
      include: [{ model: Patient }]
    });

    if (!billing || !billing.nidPhoto) {
      return res.status(404).send('NID picture not found');
    }

    const relativePath = billing.nidPhoto.replace(/^\//, '');
    const filePath = path.join(__dirname, '../public', relativePath);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send('NID picture file not found');
    }

    const ext = path.extname(filePath) || '.png';
    const nidNo = (billing.Patient?.nidPassportNo || 'nid').replace(/[^\w.-]+/g, '_');
    const billNumber = String(billing.billNumber || billing.id).replace(/[^\w.-]+/g, '_');
    const filename = `${nidNo}-nid-${billNumber}${ext}`;

    res.download(filePath, filename);
  } catch (error) {
    console.error(error);
    res.status(500).send('Failed to download NID picture');
  }
};

exports.downloadInvoiceImages = async (req, res) => {
  try {
    const billing = await Billing.findOne({
      where: {
        id: req.params.id,
        ...buildBillingAccessWhere(req)
      },
      include: [
        { model: Patient },
        { model: MedicalReport, required: false }
      ]
    });

    if (!billing) {
      return res.status(404).send('Invoice not found');
    }

    const base = `${sanitizeFileSegment(billing.Patient?.nidPassportNo, 'invoice')}_${sanitizeFileSegment(billing.Patient?.name, 'patient')}`;
    const billNumber = sanitizeFileSegment(billing.billNumber, String(billing.id));
    const entries = [];

    async function queueVariants(storedPath, label) {
      const variants = await buildImageVariantEntries(storedPath, `${base}_${label}`);
      entries.push(...variants);
    }

    await queueVariants(billing.takenPhoto, 'taken');
    await queueVariants(billing.passportPhoto, 'passport');
    await queueVariants(billing.nidPhoto, 'nid');
    if (billing.patientPhoto && billing.patientPhoto !== billing.takenPhoto) {
      await queueVariants(billing.patientPhoto, 'profile');
    }

    let reportPdfEntry = null;
    if (billing.MedicalReport) {
      const settings = await Setting.findOne();
      const browser = await launchPdfBrowser();
      try {
        const reportPdf = await medicalReportController.renderMedicalReportPdfBuffer(
          billing,
          settings,
          browser
        );
        if (reportPdf && reportPdf.length) {
          reportPdfEntry = {
            archiveName: `${base}_report.pdf`,
            buffer: Buffer.isBuffer(reportPdf) ? reportPdf : Buffer.from(reportPdf)
          };
        }
      } finally {
        await browser.close();
      }
    }

    if (!entries.length && !reportPdfEntry) {
      return res.status(404).send('No documents available for this invoice');
    }

    if (!entries.length && reportPdfEntry) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${reportPdfEntry.archiveName}"`);
      return res.send(reportPdfEntry.buffer);
    }

    if (entries.length === 1 && !reportPdfEntry) {
      const entry = entries[0];
      if (entry.filePath) {
        return res.download(entry.filePath, entry.archiveName);
      }
      const buffer = await entry.bufferPromise;
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Content-Disposition', `attachment; filename="${entry.archiveName}"`);
      return res.send(buffer);
    }

    const archive = new ZipArchive({ zlib: { level: 9 } });
    archive.on('error', (err) => {
      throw err;
    });

    const zipName = `${base}_${billNumber}_documents.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);
    archive.pipe(res);

    await appendImageVariantEntries(archive, entries);
    if (reportPdfEntry) {
      archive.append(reportPdfEntry.buffer, { name: reportPdfEntry.archiveName });
    }

    await archive.finalize();
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res.status(500).send('Failed to download invoice documents');
    }
  }
};

function sanitizeFileSegment(value, fallback) {
  const cleaned = String(value || '')
    .trim()
    .replace(/[^\w.-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned || fallback;
}

function buildBillingFolderBase(patient, bill, usedBases) {
  let base = `${sanitizeFileSegment(patient?.nidPassportNo, 'passport')}_${sanitizeFileSegment(patient?.name, 'patient')}`;
  if (usedBases.has(base)) {
    base += `_${sanitizeFileSegment(bill.billNumber, String(bill.id))}`;
  }
  usedBases.add(base);
  return base;
}

function resolvePublicFilePath(storedPath) {
  if (!storedPath) {
    return null;
  }

  const relativePath = String(storedPath).replace(/^\//, '');
  const filePath = path.join(__dirname, '../public', relativePath);
  return fs.existsSync(filePath) ? filePath : null;
}

function appendPublicFile(archive, storedPath, archivePath) {
  const filePath = resolvePublicFilePath(storedPath);
  if (!filePath) {
    return false;
  }

  archive.file(filePath, { name: archivePath });
  return true;
}

async function buildImageVariantEntries(storedPath, archiveNameBase) {
  const entries = [];
  const filePath = resolvePublicFilePath(storedPath);
  if (!filePath) return entries;

  const ext = path.extname(storedPath).toLowerCase() || '.png';
  if (ext === '.pdf') {
    return [{ filePath, archiveName: `${archiveNameBase}.pdf` }];
  }

  entries.push({ filePath, archiveName: `${archiveNameBase}${ext}` });

  if (ext === '.png') {
    const jpgCompanion = companionJpgPath(storedPath);
    const jpgPath = jpgCompanion && resolvePublicFilePath(jpgCompanion);
    if (jpgPath) {
      entries.push({ filePath: jpgPath, archiveName: `${archiveNameBase}.jpg` });
    } else {
      entries.push({
        archiveName: `${archiveNameBase}.jpg`,
        bufferPromise: sharp(filePath).jpeg({ quality: 92 }).toBuffer()
      });
    }
  } else if (ext === '.jpg' || ext === '.jpeg') {
    const pngCompanion = storedPath.replace(/\.jpe?g$/i, '.png');
    const pngPath = resolvePublicFilePath(pngCompanion);
    if (pngPath) {
      entries.push({ filePath: pngPath, archiveName: `${archiveNameBase}.png` });
    } else {
      entries.push({
        archiveName: `${archiveNameBase}.png`,
        bufferPromise: sharp(filePath).png().toBuffer()
      });
    }
  }

  return entries;
}

async function appendImageVariantEntries(archive, entries) {
  for (const entry of entries) {
    if (entry.filePath) {
      archive.file(entry.filePath, { name: entry.archiveName });
    } else if (entry.bufferPromise) {
      archive.append(await entry.bufferPromise, { name: entry.archiveName });
    }
  }
}

async function appendBillingImageFilesToArchive(archive, bill, folder, base) {
  const imageFields = [
    [bill.takenPhoto, 'taken'],
    ...(bill.patientPhoto && bill.patientPhoto !== bill.takenPhoto ? [[bill.patientPhoto, 'profile']] : []),
    [bill.passportPhoto, 'passport'],
    [bill.nidPhoto, 'nid']
  ];

  for (const [storedPath, label] of imageFields) {
    const entries = await buildImageVariantEntries(storedPath, `${folder}${base}_${label}`);
    await appendImageVariantEntries(archive, entries);
  }
}

exports.downloadSelectedInvoiceBundle = async (req, res) => {
  try {
    const rawIds = req.body.ids ?? req.query.ids;
    const ids = [...new Set(
      (Array.isArray(rawIds) ? rawIds : String(rawIds || '').split(','))
        .map((id) => parseInt(id, 10))
        .filter((id) => !Number.isNaN(id))
    )];

    if (!ids.length) {
      return res.status(400).send('Select at least one invoice');
    }

    const bills = await Billing.findAll({
      where: {
        id: { [Op.in]: ids },
        ...buildBillingAccessWhere(req)
      },
      include: [
        { model: Patient },
        { model: MedicalReport, required: false }
      ],
      order: [['billDate', 'DESC'], ['createdAt', 'DESC']]
    });

    if (!bills.length) {
      return res.status(404).send('No accessible invoices found for the selected items');
    }

    const settings = await Setting.findOne();
    const usedBases = new Set();
    let browser = null;

    const archive = new ZipArchive({ zlib: { level: 9 } });
    archive.on('error', (err) => {
      throw err;
    });

    const zipName = `invoices-${new Date().toISOString().slice(0, 10)}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);
    archive.pipe(res);

    try {
      browser = await launchPdfBrowser();

      for (const bill of bills) {
        const base = buildBillingFolderBase(bill.Patient, bill, usedBases);
        const folder = `${base}/`;

        await appendBillingImageFilesToArchive(archive, bill, folder, base);

        if (bill.MedicalReport) {
          const reportPdf = await medicalReportController.renderMedicalReportPdfBuffer(
            bill,
            settings,
            browser
          );

          if (reportPdf && reportPdf.length) {
            const pdfBuffer = Buffer.isBuffer(reportPdf) ? reportPdf : Buffer.from(reportPdf);
            archive.append(pdfBuffer, { name: `${folder}${base}_report.pdf` });
          }
        }
      }

      await archive.finalize();
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      const message = error.message || 'Failed to download selected invoices';
      res.status(500).send(message);
    }
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
      billdelivaridate,
      marketingManagerId,
      commissionPercentage,
      commissionAmount,
      referralNote
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
    
    // Calculate marketing commission if a marketing manager is assigned
    let marketingcommission = 0;
    const commissionPercentageValue = parseFloat(commissionPercentage) || 0;
    const commissionAmountValue = parseFloat(commissionAmount) || 0;
    
    if (marketingManagerId) {
      // Use the direct commission amount if provided, otherwise calculate from percentage
      marketingcommission = commissionAmountValue > 0
        ? commissionAmountValue
        : (parseFloat(netPayable) * commissionPercentageValue / 100);
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
      items: JSON.parse(items),
      createdBy: req.user?.id || null,
      marketingManagerId: marketingManagerId || null,
      marketingcommission: marketingcommission,
      referralNote: referralNote || null
    });
    
    // Create marketing commission record if applicable
    if (marketingManagerId && marketingcommission > 0) {
      await MarketingCommission.create({
        marketingManagerId: marketingManagerId,
        BillingId: billing.id,
        PatientId: patientId,
        amount: marketingcommission,
        commissionPercentage: commissionPercentageValue,
        commissionDate: today,
        status: 'pending'
      });
    }
    
    // Parse items to process appointments, cabins and tests
    const parsedItems = JSON.parse(items);
    
    // Update appointment status
    if (appointmentIds) {
      // Ensure appointmentIds is an array and properly parse JSON if needed
      let appointmentIdsArray;
      try {
        if (typeof appointmentIds === 'string') {
          appointmentIdsArray = JSON.parse(appointmentIds);
        } else if (Array.isArray(appointmentIds)) {
          appointmentIdsArray = appointmentIds;
        } else {
          appointmentIdsArray = [];
        }
      } catch (err) {
        console.error('Error parsing appointment IDs:', err);
        appointmentIdsArray = [];
      }
      
      if (appointmentIdsArray.length > 0) {
        await Promise.all(appointmentIdsArray.map(async (id) => {
          try {
            const appointmentId = parseInt(id);
            if (!isNaN(appointmentId)) {
              await Appointment.update(
                {
                  status: 'completed',
                  billingStatus: 'billed'
                },
                {
                  where: { id: appointmentId }
                }
              );
            }
          } catch (err) {
            console.error(`Error updating appointment ${id}:`, err);
          }
        }));
      }
    }
    
    // Update cabin booking status
    if (cabinBookingIds) {
      // Ensure cabinBookingIds is an array and properly parse JSON if needed
      let cabinBookingIdsArray;
      try {
        if (typeof cabinBookingIds === 'string') {
          cabinBookingIdsArray = JSON.parse(cabinBookingIds);
        } else if (Array.isArray(cabinBookingIds)) {
          cabinBookingIdsArray = cabinBookingIds;
        } else {
          cabinBookingIdsArray = [];
        }
      } catch (err) {
        console.error('Error parsing cabin booking IDs:', err);
        cabinBookingIdsArray = [];
      }
      
      if (cabinBookingIdsArray.length > 0) {
        await Promise.all(cabinBookingIdsArray.map(async (id) => {
          try {
            const cabinBookingId = parseInt(id);
            if (!isNaN(cabinBookingId)) {
              await CabinBooking.update(
                {
                  billingStatus: 'billed'
                },
                {
                  where: { id: cabinBookingId }
                }
              );
            }
          } catch (err) {
            console.error(`Error updating cabin booking ${id}:`, err);
          }
        }));
      }
    }
    
    // Process test items
    const testItems = parsedItems.filter(item => item.type === 'test');
    
    if (testItems.length > 0) {
      const testRequests = [];
      const commissionRecords = [];
      
      for (const test of testItems) {
        // Process delivery date if it exists
        let deliveryDate = null;
        if (test.deliveryDate && test.deliveryDate.trim() !== '') {
          deliveryDate = new Date(test.deliveryDate);
          
          // Check if date is valid
          if (isNaN(deliveryDate.getTime())) {
            deliveryDate = null;
          }
        }
        
        // Create test request object
        const testRequestData = {
          PatientId: patientId,
          TestId: test.id,
          DoctorId: test.doctorId || null,
          priority: test.priority || 'Normal',
          requestDate: today,
          status: 'Pending',
          billingStatus: 'billed',
          deliveryOption: test.deliveryOption || 'Not Collected',
          deliveryDate: deliveryDate,
          commission: test.commission || 0
        };
        
        testRequests.push(testRequestData);
      }
      
      // Bulk create test requests
      const createdTestRequests = await TestRequest.bulkCreate(testRequests);
      
      // Create commission records for tests with doctors
      for (let i = 0; i < createdTestRequests.length; i++) {
        const testRequest = createdTestRequests[i];
        const testItem = testItems[i];
        
        if (testRequest.DoctorId && testItem.commission > 0) {
          await DoctorCommission.create({
            DoctorId: testRequest.DoctorId,
            TestId: testRequest.TestId,
            TestRequestId: testRequest.id,
            BillingId: billing.id,
            amount: testItem.commission,
            commissionDate: today,
            status: 'pending'
          });
        }
      }
    }
    
    const fullBilling = await Billing.findByPk(billing.id, {
      include: [
        { model: Patient }
      ]
    });
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(201).json(fullBilling);
    }
    
    res.redirect(`/billing/photo/${billing.id}`);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Render patient photo capture page (after billing is created)
exports.renderBillingPhotoPage = async (req, res) => {
  try {
    const billing = await Billing.findOne({
      where: {
        id: req.params.id,
        ...buildBillingAccessWhere(req)
      },
      include: [{ model: Patient }]
    });

    if (!billing) {
      return res.status(404).send('Billing not found');
    }

    res.render('billing_photo', {
      title: 'Patient Photo',
      billing
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

exports.generateAiPortrait = async (req, res) => {
  try {
    const billing = await Billing.findOne({
      where: {
        id: req.params.id,
        ...buildBillingAccessWhere(req)
      }
    });

    if (!billing) {
      return res.status(404).json({ message: 'Billing not found' });
    }

    const photoFile = req.file;
    if (!photoFile) {
      return res.status(400).json({ message: 'Upload a patient profile photo first' });
    }

    const portraitBuffers = await generateAiPortrait(photoFile.path);
    const { imageUrl, imageUrlJpg } = saveAiPortraitFiles(billing.id, portraitBuffers);

    if (photoFile.path && fs.existsSync(photoFile.path) && !photoFile.filename.startsWith('ai-')) {
      try {
        fs.unlinkSync(photoFile.path);
      } catch (unlinkErr) {
        console.error('Could not remove temp upload:', unlinkErr);
      }
    }

    res.json({
      success: true,
      imageUrl,
      imageUrlJpg,
      message: 'AI portrait generated successfully'
    });
  } catch (error) {
    console.error('AI portrait error:', error);
    res.status(500).json({
      message: error.message || 'Failed to generate AI portrait'
    });
  }
};

// Save patient photo from webcam capture or file upload
exports.uploadBillingPhoto = async (req, res) => {
  try {
    const billing = await Billing.findOne({
      where: {
        id: req.params.id,
        ...buildBillingAccessWhere(req)
      }
    });

    if (!billing) {
      return res.status(404).json({ message: 'Billing not found' });
    }

    const takenFile = req.files?.takenPhoto?.[0];
    const photoFile = req.files?.photo?.[0];
    const passportFile = req.files?.passportPhoto?.[0];
    const nidFile = req.files?.nidPhoto?.[0];

    if (!takenFile || !passportFile) {
      return res.status(400).json({
        message: 'Taken photo and passport picture are both required.'
      });
    }

    const takenPhotoPath = await persistBillingPhotoAsPng(takenFile.path, billing.id, 'taken');
    const updates = {
      takenPhoto: takenPhotoPath,
      patientPhoto: photoFile
        ? await persistBillingPhotoAsPng(photoFile.path, billing.id, 'bill')
        : takenPhotoPath,
      passportPhoto: await persistBillingPassportFile(
        passportFile.path,
        billing.id,
        passportFile.originalname
      )
    };

    if (nidFile) {
      updates.nidPhoto = await persistBillingNidFile(
        nidFile.path,
        billing.id,
        nidFile.originalname
      );
    }

    await billing.update(updates);

    res.json({
      success: true,
      redirect: `/billing/receipt/${billing.id}`
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get billing by ID
exports.getBilling = async (req, res) => {
  try {
    const billing = await Billing.findOne({
      where: {
        id: req.params.id,
        ...buildBillingAccessWhere(req)
      },
      include: [
        { model: Patient }
      ]
    });
    
    if (!billing) {
      return res.status(404).json({ message: 'Billing not found' });
    }
    
    // Get marketing manager data if exists
    let marketingManager = null;
    if (billing.marketingManagerId) {
      marketingManager = await User.findByPk(billing.marketingManagerId, {
        attributes: ['id', 'username', 'email']
      });
    }
    
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json(billing);
    }
    
    res.render('billing_receipt', {
      title: 'Billing Receipt',
      billing,
      marketingManager
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
      where: {
        PatientId: patientId,
        ...buildBillingAccessWhere(req)
      },
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
    const { paidAmount, paymentMethod, secondDiscountPercentage, secondDiscountAmount } = req.body;
    
    let billing = await Billing.findOne({
      where: {
        id: req.params.id,
        ...buildBillingAccessWhere(req)
      }
    });
    
    if (!billing) {
      return res.status(404).json({ message: 'Billing not found' });
    }

    // Calculate second discount
    const originalNetPayable = parseFloat(billing.netPayable);
    let secondDiscount = 0;

    if (parseFloat(secondDiscountAmount) > 0) {
      secondDiscount = parseFloat(secondDiscountAmount);
    } else if (parseFloat(secondDiscountPercentage) > 0) {
      secondDiscount = (originalNetPayable * parseFloat(secondDiscountPercentage)) / 100;
    }

    // Ensure second discount doesn't exceed net payable
    secondDiscount = Math.min(secondDiscount, originalNetPayable);

    // Calculate new net payable after second discount
    const finalNetPayable = originalNetPayable - secondDiscount;
    
    // Update total discount amount and percentage
    const newTotalDiscountAmount = parseFloat(billing.discountAmount) + secondDiscount;
    const newTotalDiscountPercentage = (newTotalDiscountAmount / parseFloat(billing.totalAmount)) * 100;

    const newPaidAmount = parseFloat(paidAmount);
    const newDueAmount = Math.max(0, finalNetPayable - newPaidAmount);
    
    // Determine status - only 'paid' or 'due'
    const status = newPaidAmount >= finalNetPayable ? 'paid' : 'due';
    
    billing = await billing.update({
      discountAmount: newTotalDiscountAmount,
      discountPercentage: newTotalDiscountPercentage,
      netPayable: finalNetPayable,
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
        { model: Doctor, required: false }
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

// Edit billing page
exports.editBillingPage = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the billing with all related data
    const billing = await Billing.findOne({
      where: {
        id,
        ...buildBillingAccessWhere(req)
      },
      include: [
        { model: Patient }
      ]
    });
    
    if (!billing) {
      return res.status(404).render('error', {
        title: 'Error',
        message: 'Billing record not found'
      });
    }
    
    // Parse items if it's a string
    if (typeof billing.items === 'string') {
      billing.items = JSON.parse(billing.items);
    }
    
    // Get data needed for the billing page
    const patients = await Patient.findAll({
      where: buildPatientAccessWhere(req),
      order: [['name', 'ASC']]
    });
    const doctors = await Doctor.findAll();
    const tests = await Test.findAll();
    const cabins = await Cabin.findAll();
    
    // Get feature permissions from request
    const featurePermissions = req.featurePermissions || {};
    
    // Check feature visibility for current user
    const userRole = req.user.role;
    
    // For admin users, all features are visible regardless of permission settings
    let visibleFeatures;
    if (userRole === 'softadmin') {
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
    
    res.render('billing_edit', {
      title: 'Edit Billing',
      billing,
      patients,
      doctors,
      tests,
      cabins,
      visibleFeatures,
      existingItems: billing.items || []
    });
  } catch (error) {
    console.error('Error in editBillingPage:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load billing edit page: ' + error.message
    });
  }
};

// Update billing
exports.updateBilling = async (req, res) => {
  try {
    const { id } = req.params;
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
      billdelivaridate,
      marketingManagerId,
      referralNote
    } = req.body;
    
    // Find the billing
    const billing = await Billing.findOne({
      where: {
        id,
        ...buildBillingAccessWhere(req)
      }
    });
    
    if (!billing) {
      return res.status(404).json({ message: 'Billing record not found' });
    }
    
    // Validate total amount
    if (parseFloat(totalAmount) <= 0) {
      return res.status(400).json({ message: "Cannot update a bill with zero or negative amount" });
    }
    
    // Determine status - only 'paid' or 'due'
    let status;
    if (parseFloat(paidAmount) >= parseFloat(netPayable)) {
      status = 'paid';
    } else {
      status = 'due';
    }
    
    // Parse the new items
    const newItems = items ? JSON.parse(items) : [];
    
    // Get the old items
    const oldItems = typeof billing.items === 'string' ? JSON.parse(billing.items) : billing.items || [];
    
    // Process appointment IDs if present
    let parsedAppointmentIds = [];
    if (appointmentIds) {
      try {
        parsedAppointmentIds = JSON.parse(appointmentIds);
        console.log(`Received ${parsedAppointmentIds.length} appointment IDs for billing update`);
      } catch (parseError) {
        console.error('Error parsing appointment IDs:', parseError);
      }
    }
    
    // Track changes to process database updates
    await processItemChanges(oldItems, newItems, patientId, id, parsedAppointmentIds);
    
    // Update the billing
    await billing.update({
      PatientId: patientId,
      billdelivaridate: billdelivaridate || null,
      totalAmount,
      discountPercentage,
      discountAmount,
      netPayable,
      paymentMethod,
      paidAmount,
      dueAmount,
      status,
      items: newItems,
      marketingManagerId: marketingManagerId || null,
      referralNote: referralNote || null
    });
    
    res.status(200).json({ 
      message: 'Billing updated successfully',
      billing: billing
    });
  } catch (error) {
    console.error('Error in updateBilling:', error);
    res.status(500).json({ message: 'Failed to update billing: ' + error.message });
  }
};

// Helper function to process item changes
async function processItemChanges(oldItems, newItems, patientId, billingId, appointmentIds = []) {
  try {
    // Group items by type
    const oldItemsByType = {
      doctor: oldItems.filter(item => item.type === 'appointment'),
      test: oldItems.filter(item => item.type === 'test'),
      cabin: oldItems.filter(item => item.type === 'cabin')
    };
    
    const newItemsByType = {
      doctor: newItems.filter(item => item.type === 'appointment'),
      test: newItems.filter(item => item.type === 'test'),
      cabin: newItems.filter(item => item.type === 'cabin')
    };
    
    // Process Doctor appointments
    await processAppointments(oldItemsByType.doctor, newItemsByType.doctor, patientId, billingId, appointmentIds);
    
    // Process Test requests
    await processTestRequests(oldItemsByType.test, newItemsByType.test, patientId, billingId);
    
    // Process Cabin bookings
    await processCabinBookings(oldItemsByType.cabin, newItemsByType.cabin, patientId, billingId);
    
  } catch (error) {
    console.error('Error processing item changes:', error);
    throw error; // Rethrow to be handled by caller
  }
}

// Process Appointment changes
async function processAppointments(oldItems, newItems, patientId, billingId, appointmentIds = []) {
  try {
    // Get IDs from old and new items
    const oldIds = oldItems.map(item => item.id);
    const newIds = newItems.map(item => item.id);
    
    // Find doctor items that were removed
    const removedIds = oldIds.filter(id => !newIds.includes(id));
    
    // Find doctor items that were added
    const addedIds = newIds.filter(id => !oldIds.includes(id));
    
    console.log(`Processing appointment changes - Removed: ${removedIds.length}, Added: ${addedIds.length}, Explicit Appointments: ${appointmentIds.length}`);
    
    // Process appointments from explicit appointment IDs if available
    if (appointmentIds && appointmentIds.length > 0) {
      // Reset the previous appointments for this bill that are not in the new list
      const previousAppointments = await Appointment.findAll({
        where: {
          PatientId: patientId,
          billingStatus: 'billed',
          id: {
            [Op.notIn]: appointmentIds
          }
        }
      });
      
      if (previousAppointments.length > 0) {
        const previousAppointmentIds = previousAppointments.map(appt => appt.id);
        const resetResult = await Appointment.update(
          {
            billingStatus: 'not_billed',
            status: 'scheduled'
          },
          {
            where: {
              id: {
                [Op.in]: previousAppointmentIds
              }
            }
          }
        );
        console.log(`Reset ${resetResult[0]} previous appointments to not_billed`);
      }
      
      // Update status for the new appointment IDs
      const updateResult = await Appointment.update(
        {
          billingStatus: 'billed',
          status: 'completed'
        },
        {
          where: {
            id: {
              [Op.in]: appointmentIds
            }
          }
        }
      );
      console.log(`Updated ${updateResult[0]} appointments to billed/completed from explicit IDs`);
      
    } else {
      // Fallback to using doctor IDs if appointment IDs not provided
      
      // Reset appointments for removed doctors
      if (removedIds.length > 0) {
        const removedAppointments = await Appointment.findAll({
          where: {
            DoctorId: {
              [Op.in]: removedIds
            },
            PatientId: patientId,
            billingStatus: 'billed'
          }
        });
        
        if (removedAppointments.length > 0) {
          const removedAppointmentIds = removedAppointments.map(appt => appt.id);
          const resetResult = await Appointment.update(
            {
              billingStatus: 'not_billed',
              status: 'scheduled'
            },
            {
              where: {
                id: {
                  [Op.in]: removedAppointmentIds
                }
              }
            }
          );
          console.log(`Reset ${resetResult[0]} appointments for removed doctors to not_billed`);
        }
      }
      
      // Find and update appointments for added doctors
      if (addedIds.length > 0) {
        const addedAppointments = await Appointment.findAll({
          where: {
            DoctorId: {
              [Op.in]: addedIds
            },
            PatientId: patientId,
            billingStatus: 'not_billed'
          },
          order: [['appointmentDate', 'DESC']],
          limit: addedIds.length // Only get the most recent appointment per doctor
        });
        
        if (addedAppointments.length > 0) {
          const addedAppointmentIds = addedAppointments.map(appt => appt.id);
          const updateResult = await Appointment.update(
            {
              billingStatus: 'billed',
              status: 'completed'
            },
            {
              where: {
                id: {
                  [Op.in]: addedAppointmentIds
                }
              }
            }
          );
          console.log(`Updated ${updateResult[0]} appointments for added doctors to billed/completed`);
        }
      }
    }
  } catch (error) {
    console.error('Error in processAppointments:', error);
    throw error;
  }
}

// Process Test Request changes
async function processTestRequests(oldItems, newItems, patientId, billingId) {
  try {
    // Get IDs from old and new items
    const oldIds = oldItems.map(item => item.id);
    const newIds = newItems.map(item => item.id);
    
    // Find test items that were removed
    const removedIds = oldIds.filter(id => !newIds.includes(id));
    
    // Find test items that were added
    const addedItems = newItems.filter(item => !oldIds.includes(item.id));
    
    console.log(`Processing test changes - Removed: ${removedIds.length}, Added: ${addedItems.length}`);
    
    // Delete removed test requests
    if (removedIds.length > 0) {
      // Find all test requests that match these criteria
      const testRequests = await TestRequest.findAll({
        where: { 
          TestId: {
            [Op.in]: removedIds
          },
          PatientId: patientId,
          billingStatus: 'billed'
        }
      });
      
      console.log(`Found ${testRequests.length} test requests to delete`);
      
      // Delete each test request
      if (testRequests.length > 0) {
        const testRequestIds = testRequests.map(tr => tr.id);
        
        await TestRequest.destroy({
          where: { 
            id: {
              [Op.in]: testRequestIds
            }
          }
        });
        
        // Also delete any doctor commissions related to these test requests
        await DoctorCommission.destroy({
          where: {
            BillingId: billingId,
            TestRequestId: {
              [Op.in]: testRequestIds
            }
          }
        });
      }
    }
    
    // Create new test requests for added tests
    if (addedItems.length > 0) {
      const today = new Date();
      
      console.log(`Creating ${addedItems.length} new test requests`);
      
      for (const test of addedItems) {
        try {
          // Create test request object
          const testRequestData = {
            PatientId: patientId,
            TestId: test.id,
            DoctorId: test.doctorId || null,
            priority: test.priority || 'Normal',
            requestDate: today,
            status: 'Pending',
            billingStatus: 'billed',
            deliveryOption: test.deliveryOption || 'Not Collected',
            deliveryDate: test.deliveryDate ? new Date(test.deliveryDate) : null,
            commission: test.commission || 0
          };
          
          const testRequest = await TestRequest.create(testRequestData);
          console.log(`Created test request ID: ${testRequest.id} for test ID: ${test.id}`);
          
          // Create commission record if applicable
          if (testRequest.DoctorId && test.commission > 0) {
            await DoctorCommission.create({
              DoctorId: testRequest.DoctorId,
              TestId: testRequest.TestId,
              TestRequestId: testRequest.id,
              BillingId: billingId,
              amount: test.commission,
              commissionDate: today,
              status: 'pending'
            });
            console.log(`Created commission record for doctor ID: ${testRequest.DoctorId}`);
          }
        } catch (testError) {
          console.error(`Error creating test request for test ID ${test.id}:`, testError);
        }
      }
    }
  } catch (error) {
    console.error('Error in processTestRequests:', error);
    throw error;
  }
}

// Process Cabin Booking changes
async function processCabinBookings(oldItems, newItems, patientId, billingId) {
  try {
    // Get IDs from old and new items
    const oldIds = oldItems.map(item => item.id);
    const newIds = newItems.map(item => item.id);
    
    // Find cabin items that were removed
    const removedIds = oldIds.filter(id => !newIds.includes(id));
    
    // Find cabin items that were added
    const addedItems = newItems.filter(item => !oldIds.includes(item.id));
    
    console.log(`Processing cabin changes - Removed: ${removedIds.length}, Added: ${addedItems.length}`);
    
    // Reset status for removed cabin bookings
    if (removedIds.length > 0) {
      // Find existing cabin bookings first
      const cabinBookings = await CabinBooking.findAll({
        where: { 
          CabinId: {
            [Op.in]: removedIds
          },
          PatientId: patientId,
          billingStatus: 'billed'
        }
      });
      
      console.log(`Found ${cabinBookings.length} cabin bookings to reset to unbilled`);
      
      if (cabinBookings.length > 0) {
        const cabinBookingIds = cabinBookings.map(cb => cb.id);
        
        // Update booking status
        await CabinBooking.update(
          { billingStatus: 'not_billed' },
          { 
            where: { 
              id: {
                [Op.in]: cabinBookingIds
              }
            }
          }
        );
        console.log(`Reset ${cabinBookingIds.length} cabin bookings to not_billed`);
      }
    }
    
    // Update status for added cabin bookings
    if (addedItems.length > 0) {
      console.log(`Processing ${addedItems.length} cabin additions`);
      
      for (const item of addedItems) {
        console.log(`Processing cabin ID: ${item.id}, name: ${item.name}`);
        
        // Check if this is a new cabin booking or an existing unbilled one
        const existingBooking = await CabinBooking.findOne({
          where: {
            CabinId: item.id,
            PatientId: patientId,
            billingStatus: 'not_billed'
          }
        });
        
        if (existingBooking) {
          // Update existing booking
          await existingBooking.update({
            billingStatus: 'billed'
          });
          console.log(`Updated existing cabin booking ID: ${existingBooking.id} to billed`);
        } else {
          // Create new booking if needed
          // Extract days from the item name or use default value
          let days = 1;
          const daysMatch = item.name.match(/(\d+) day/);
          if (daysMatch && daysMatch[1]) {
            days = parseInt(daysMatch[1]);
          }
          
          const newBooking = await CabinBooking.create({
            PatientId: patientId,
            CabinId: item.id,
            admissionDate: new Date(),
            expectedStay: days,
            dailyRate: item.price / days,
            status: 'active',
            billingStatus: 'billed'
          });
          console.log(`Created new cabin booking ID: ${newBooking.id} for cabin ID: ${item.id}, days: ${days}`);
        }
      }
    }
  } catch (error) {
    console.error('Error in processCabinBookings:', error);
    throw error;
  }
}

// Delete billing
exports.deleteBilling = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the billing with items
    const billing = await Billing.findOne({
      where: {
        id,
        ...buildBillingAccessWhere(req)
      }
    });
    
    if (!billing) {
      return res.status(404).json({ message: 'Billing record not found' });
    }
    
    // Parse items if they're stored as a string
    const billItems = typeof billing.items === 'string' ? JSON.parse(billing.items) : billing.items || [];
    console.log(`Deleting billing #${id} with ${billItems.length} items`);
    
    // Group items by type
    const itemsByType = {
      doctor: billItems.filter(item => item.type === 'appointment'),
      test: billItems.filter(item => item.type === 'test'),
      cabin: billItems.filter(item => item.type === 'cabin')
    };
    
    console.log(`Grouped items: ${itemsByType.doctor.length} doctor, ${itemsByType.test.length} test, ${itemsByType.cabin.length} cabin`);
    
    // Begin a transaction to ensure consistency
    const t = await sequelize.transaction();
    
    try {
      // Reset status for doctor appointments
      const doctorIds = itemsByType.doctor.map(item => item.id);
      if (doctorIds.length > 0) {
        const apptResult = await Appointment.update(
          {
            billingStatus: 'not_billed',
            status: 'scheduled'
          },
          {
            where: { 
              id: {
                [Op.in]: doctorIds
              }
            },
            transaction: t
          }
        );
        console.log(`Reset ${apptResult[0]} doctor appointments to not_billed`);
      }
      
      // Delete test requests
      const testIds = itemsByType.test.map(item => item.id);
      if (testIds.length > 0) {
        // First find the actual test requests
        const testRequests = await TestRequest.findAll({
          where: { 
            TestId: {
              [Op.in]: testIds
            },
            PatientId: billing.PatientId,
            billingStatus: 'billed'
          },
          transaction: t
        });
        
        if (testRequests.length > 0) {
          const testRequestIds = testRequests.map(tr => tr.id);
          
          // Delete doctor commissions related to these test requests
          const commDelResult = await DoctorCommission.destroy({
            where: {
              BillingId: id,
              TestRequestId: {
                [Op.in]: testRequestIds
              }
            },
            transaction: t
          });
          console.log(`Deleted ${commDelResult} doctor commission records for test requests`);
          
          // Then delete the test requests
          const testDelResult = await TestRequest.destroy({
            where: { 
              id: {
                [Op.in]: testRequestIds
              }
            },
            transaction: t
          });
          console.log(`Deleted ${testDelResult} test requests`);
        }
        
        // Also check for any other doctor commissions related to this billing
        const otherCommDelResult = await DoctorCommission.destroy({
          where: {
            BillingId: id,
            TestRequestId: {
              [Op.notIn]: testRequests.map(tr => tr.id)
            }
          },
          transaction: t
        });
        if (otherCommDelResult > 0) {
          console.log(`Deleted ${otherCommDelResult} additional doctor commission records`);
        }
      } else {
        // If no test items but billing may still have commissions
        const commDelResult = await DoctorCommission.destroy({
          where: {
            BillingId: id
          },
          transaction: t
        });
        if (commDelResult > 0) {
          console.log(`Deleted ${commDelResult} doctor commission records with no related test items`);
        }
      }
      
      // Reset cabin bookings
      const cabinIds = itemsByType.cabin.map(item => item.id);
      if (cabinIds.length > 0) {
        // First find the actual cabin bookings
        const cabinBookings = await CabinBooking.findAll({
          where: { 
            CabinId: {
              [Op.in]: cabinIds
            },
            PatientId: billing.PatientId,
            billingStatus: 'billed'
          },
          transaction: t
        });
        
        if (cabinBookings.length > 0) {
          const cabinBookingIds = cabinBookings.map(cb => cb.id);
          
          const cabinResult = await CabinBooking.update(
            { billingStatus: 'not_billed' },
            {
              where: { 
                id: {
                  [Op.in]: cabinBookingIds
                }
              },
              transaction: t
            }
          );
          console.log(`Reset ${cabinResult[0]} cabin bookings to not_billed`);
        }
      }
      
      // Delete marketing commission records if any
      const mktDelResult = await MarketingCommission.destroy({
        where: { BillingId: id },
        transaction: t
      });
      console.log(`Deleted ${mktDelResult} marketing commission records`);

      // Delete medical report if any
      const reportDelResult = await MedicalReport.destroy({
        where: { BillingId: id },
        transaction: t
      });
      if (reportDelResult > 0) {
        console.log(`Deleted ${reportDelResult} medical report record(s)`);
      }
      
      // Delete the billing record
      await billing.destroy({ transaction: t });
      console.log(`Deleted billing record #${id}`);
      
      // Commit the transaction
      await t.commit();
      console.log(`Transaction committed successfully`);
      
      res.status(200).json({ message: 'Billing and related records deleted successfully' });
      
    } catch (error) {
      // Rollback transaction on error
      console.error('Error during billing deletion transaction:', error);
      await t.rollback();
      console.log('Transaction rolled back due to error');
      throw error;
    }
    
  } catch (error) {
    console.error('Error in deleteBilling:', error);
    res.status(500).json({ message: `Failed to delete billing: ${error.message}` });
  }
};

// Helper function to update appointment status
async function updateAppointmentStatus(appointmentId, status) {
  try {
    const Appointment = require('../models/Appointment');
    
    const appointment = await Appointment.findByPk(appointmentId);
    if (appointment) {
      await appointment.update({
        status: status,
        billingStatus: 'billed'
      });
    }
  } catch (error) {
    console.error(`Error updating appointment status: ${error.message}`);
    throw error; // Rethrow to be caught and handled by the caller
  }
}

module.exports = exports;