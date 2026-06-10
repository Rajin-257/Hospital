const path = require('path');
const ejs = require('ejs');
const { htmlToPdfBuffer } = require('../utils/reportPdf');
const { storedPathToDataUri } = require('../utils/imageDataUri');
const { getPdfExportHeadHtml } = require('../utils/reportFonts');

const PUBLIC_ROOT = path.join(__dirname, '../public');
const Billing = require('../models/Billing');
const MedicalReport = require('../models/MedicalReport');
const Patient = require('../models/Patient');
const { Op } = require('sequelize');

function buildBillingAccessWhere(req) {
  if (req.user?.role === 'receptionist') {
    return { createdBy: req.user.id };
  }
  return {};
}

function todayDateStr() {
  return new Date().toISOString().slice(0, 10);
}

const DUMMY_HEIGHT = '175';
const DUMMY_WEIGHT = '65';
const DEFAULT_XRAY_IMAGE = '/x-ray.jpeg';
const DEFAULT_FINGERPRINT_IMAGE = '/fp.png';

const BLOOD_BIOCHEMISTRY_TESTS = [
  { name: 'R.B.S.', field: 'rbs', reference: '3.8 - 7.8 mmol/L' },
  {
    name: 'Creatinine',
    field: 'creatinine',
    reference: 'Men: 0.70 - 1.20 mg/dl\nWomen: 0.50 - 0.90 mg/dl'
  },
  { name: 'T.BIL', field: 'tbil', reference: '0.1 - 1.2 mg/dL' },
  {
    name: 'SGPT',
    field: 'sgtp',
    reference: 'Men: Upto 40 U/L\nWomen: Upto 32 U/L'
  },
  {
    name: 'SGOT',
    field: 'sgot',
    reference: 'Men: Upto 38 U/L\nWomen: Upto 31 U/L'
  },
  {
    name: 'ALP',
    field: 'alp',
    reference: 'Children (1-14 Years): Upto < 645 U/L\nAdult: 98-279 U/L'
  },
  { name: 'UREA', field: 'urea', reference: '5 - 20 mg/dL' }
];

function resolveXrayImage(image) {
  if (image !== undefined && image !== null && String(image).trim() !== '') {
    return String(image).trim();
  }

  return DEFAULT_XRAY_IMAGE;
}

function extractMeasurement(value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }

  const match = String(value).trim().match(/[\d.]+/);
  return match ? match[0] : String(value).trim();
}

function resolveHeightWeight(patient, savedHeight, savedWeight) {
  const height = extractMeasurement(savedHeight)
    ?? extractMeasurement(patient?.height)
    ?? DUMMY_HEIGHT;
  const weight = extractMeasurement(savedWeight)
    ?? extractMeasurement(patient?.weight)
    ?? DUMMY_WEIGHT;

  return { height, weight };
}

function getDefaultReportData(patient) {
  const { height, weight } = resolveHeightWeight(patient);

  return {
    reportDate: todayDateStr(),
    issueDate: todayDateStr(),
    height,
    weight,
    status: 'Fit',
    comment: '',
    showSign: false,
    examination: {
      eye_right: '6',
      eye_left: '6',
      ear_right: 'NAD',
      ear_left: 'NAD',
      heart: 'NAD',
      bp: '120/70',
      lungs: 'NAD',
      gastrointestinal_abdomen: 'NAD',
      hernia: 'ABSENT',
      varicoseveins: 'ABSENT',
      deformities: 'NAD',
      skin: 'NAD',
      cns: 'NAD',
      extremities: 'NAD',
      psychiatry: 'NORMAL',
      operation_history: 'NAD',
      venereal_diseases: 'NO'
    },
    xray: {
      xray: '',
      ecg: ''
    },
    laboratory: {
      sugar: 'Nil',
      albumin: 'Nil',
      bilharziasis: 'Not Found',
      pregnancy: '',
      urine_other: '',
      helminthes: 'Stool R/E (If Required)',
      giardia: 'Not Found',
      stool_bilharziasis: 'Not Found',
      culture: '',
      malaria: 'Not Found',
      microfilaria: 'Not Found',
      blood_group: 'B+',
      haemoglobin: '13.5',
      esr: '12',
      rbs: '130',
      creatinine: '0.4',
      tbil: '0.9',
      sgtp: '20',
      sgot: '34',
      alp: '122',
      urea: '18',
      hivi_hivii: 'Negative',
      hbag: 'Negative',
      anti_hcv: 'Negative',
      tpha: 'Negative',
      vdrl: 'Non Reacitive'
    }
  };
}

function normalizeStoredExamination(exam) {
  if (!exam) return {};
  return {
    eye_right: exam.eye_right ?? exam.eyeVisualAcuityR,
    eye_left: exam.eye_left ?? exam.eyeVisualAcuityL,
    ear_right: exam.ear_right ?? exam.earR,
    ear_left: exam.ear_left ?? exam.earL,
    heart: exam.heart,
    bp: exam.bp,
    lungs: exam.lungs,
    gastrointestinal_abdomen: exam.gastrointestinal_abdomen ?? exam.abdomen,
    hernia: exam.hernia,
    varicoseveins: exam.varicoseveins ?? exam.varicoseVeins,
    deformities: exam.deformities,
    skin: exam.skin,
    cns: exam.cns,
    extremities: exam.extremities,
    psychiatry: exam.psychiatry,
    operation_history: exam.operation_history ?? exam.operationHistory,
    venereal_diseases: exam.venereal_diseases ?? exam.venerealSymptoms
  };
}

function normalizeStoredXray(xray) {
  if (!xray) return {};
  return {
    xray: xray.xray ?? xray.chestXray ?? '',
    ecg: xray.ecg ?? ''
  };
}

function normalizeStoredLaboratory(lab) {
  if (!lab) return {};
  return {
    sugar: lab.sugar ?? lab.urineSugar,
    albumin: lab.albumin ?? lab.urineAlbumin,
    bilharziasis: lab.bilharziasis ?? lab.bilharziasisUrine,
    pregnancy: lab.pregnancy ?? lab.pregnancyTest,
    urine_other: lab.urine_other ?? lab.urineOthers,
    helminthes: lab.helminthes ?? lab.stoolHelminthes,
    giardia: lab.giardia ?? lab.stoolGiardia,
    stool_bilharziasis: lab.stool_bilharziasis ?? lab.bilharziasisStool,
    culture: lab.culture,
    malaria: lab.malaria,
    microfilaria: lab.microfilaria,
    blood_group: lab.blood_group ?? lab.bloodGroup,
    haemoglobin: lab.haemoglobin,
    esr: lab.esr,
    rbs: lab.rbs,
    creatinine: lab.creatinine,
    tbil: lab.tbil,
    sgtp: lab.sgtp ?? lab.sgpt,
    sgot: lab.sgot,
    alp: lab.alp,
    urea: lab.urea,
    hivi_hivii: lab.hivi_hivii ?? lab.hiv,
    hbag: lab.hbag ?? lab.hbsag,
    anti_hcv: lab.anti_hcv ?? lab.antiHcv,
    tpha: lab.tpha,
    vdrl: lab.vdrl
  };
}

function reportToFormData(report, patient) {
  const defaults = getDefaultReportData(patient);
  const data = report.examinationData || {};
  const { height, weight } = resolveHeightWeight(patient, report.height, report.weight);

  return {
    reportDate: report.reportDate || defaults.reportDate,
    issueDate: report.issueDate || defaults.issueDate,
    height,
    weight,
    status: report.status || defaults.status,
    comment: report.comment ?? defaults.comment,
    showSign: report.showSign === true,
    examination: { ...defaults.examination, ...normalizeStoredExamination(data.examination) },
    xray: { ...defaults.xray, ...normalizeStoredXray(data.xray) },
    laboratory: { ...defaults.laboratory, ...normalizeStoredLaboratory(data.laboratory) }
  };
}

function buildExaminationData(body) {
  return {
    examination: {
      eye_right: body.eye_right || '',
      eye_left: body.eye_left || '',
      ear_right: body.ear_right || '',
      ear_left: body.ear_left || '',
      heart: body.heart || '',
      bp: body.bp || '',
      lungs: body.lungs || '',
      gastrointestinal_abdomen: body.gastrointestinal_abdomen || '',
      hernia: body.hernia || '',
      varicoseveins: body.varicoseveins || '',
      deformities: body.deformities || '',
      skin: body.skin || '',
      cns: body.cns || '',
      extremities: body.extremities || '',
      psychiatry: body.psychiatry || '',
      operation_history: body.operation_history || '',
      venereal_diseases: body.venereal_diseases || ''
    },
    xray: {
      xray: body.xray || '',
      ecg: body.ecg || ''
    },
    laboratory: {
      sugar: body.sugar || '',
      albumin: body.albumin || '',
      bilharziasis: body.bilharziasis || '',
      pregnancy: body.pregnancy || '',
      urine_other: body.urine_other || '',
      helminthes: body.helminthes || '',
      giardia: body.giardia || '',
      stool_bilharziasis: body.stool_bilharziasis || '',
      culture: body.culture || '',
      malaria: body.malaria || '',
      microfilaria: body.microfilaria || '',
      blood_group: body.blood_group || '',
      haemoglobin: body.haemoglobin || '',
      esr: body.esr || '',
      rbs: body.rbs || '',
      creatinine: body.creatinine || '',
      tbil: body.tbil || '',
      sgtp: body.sgtp || '',
      sgot: body.sgot || '',
      alp: body.alp || '',
      urea: body.urea || '',
      hivi_hivii: body.hivi_hivii || '',
      hbag: body.hbag || '',
      anti_hcv: body.anti_hcv || '',
      tpha: body.tpha || '',
      vdrl: body.vdrl || ''
    }
  };
}

exports.renderMedicalReportForm = async (req, res) => {
  try {
    const billingId = req.params.id;
    const billing = await Billing.findOne({
      where: {
        id: billingId,
        ...buildBillingAccessWhere(req)
      },
      include: [{ model: Patient }]
    });

    if (!billing) {
      return res.status(404).render('error', {
        title: 'Error',
        message: 'Invoice not found'
      });
    }

    const allBillings = await Billing.findAll({
      where: buildBillingAccessWhere(req),
      include: [{ model: Patient, attributes: ['id', 'name', 'patientId', 'height', 'weight'] }],
      order: [['id', 'DESC']],
      attributes: ['id', 'billNumber', 'billDate']
    });

    const billingIds = allBillings.map((b) => b.id);
    const existingReports = billingIds.length
      ? await MedicalReport.findAll({
          where: { BillingId: { [Op.in]: billingIds } },
          attributes: ['BillingId', 'height', 'weight', 'id']
        })
      : [];

    const reportByBilling = {};
    existingReports.forEach((r) => {
      reportByBilling[r.BillingId] = r;
    });

    allBillings.forEach((inv) => {
      const saved = reportByBilling[inv.id];
      const resolved = resolveHeightWeight(inv.Patient, saved?.height, saved?.weight);
      inv.optionHeight = resolved.height;
      inv.optionWeight = resolved.weight;
    });

    let report = await MedicalReport.findOne({ where: { BillingId: billingId } });
    const reportData = report
      ? reportToFormData(report, billing.Patient)
      : getDefaultReportData(billing.Patient);
    const xrayImageUrl = resolveXrayImage(report?.xrayImage);

    res.render('billing_medical_report', {
      title: 'Medical Report',
      billing,
      report,
      reportData,
      allBillings,
      xrayImageUrl,
      bloodBiochemistryTests: BLOOD_BIOCHEMISTRY_TESTS
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load medical report form'
    });
  }
};

exports.saveMedicalReport = async (req, res) => {
  try {
    const billingId = parseInt(req.body.invoice_id || req.body.billingId || req.params.id, 10);
    const billing = await Billing.findOne({
      where: {
        id: billingId,
        ...buildBillingAccessWhere(req)
      },
      include: [{ model: Patient }]
    });

    if (!billing) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const { height, weight } = resolveHeightWeight(
      billing.Patient,
      req.body.height,
      req.body.weight
    );

    const examinationData = buildExaminationData(req.body);
    let report = await MedicalReport.findOne({ where: { BillingId: billingId } });

    let xrayImage = null;
    if (req.file) {
      xrayImage = `/uploads/medical_reports/${req.file.filename}`;
    } else if (req.body.xray_image_old) {
      xrayImage = req.body.xray_image_old;
    } else if (report?.xrayImage) {
      xrayImage = report.xrayImage;
    }

    const payload = {
      BillingId: billingId,
      reportDate: req.body.report_date || req.body.reportDate || todayDateStr(),
      issueDate: req.body.issue_date || req.body.issueDate || todayDateStr(),
      height,
      weight,
      status: req.body.report_status || req.body.status || 'Fit',
      comment: req.body.remarks || req.body.comment || null,
      showSign: req.body.show_sign === '1' || req.body.show_sign === 1 || req.body.showSign === 'yes',
      examinationData,
      xrayImage: resolveXrayImage(xrayImage)
    };

    if (report) {
      await report.update(payload);
    } else {
      report = await MedicalReport.create(payload);
    }

    return res.json({
      success: true,
      message: 'Medical report saved successfully',
      redirect: `/billing/medical-report/${billingId}/print`
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to save medical report' });
  }
};

exports.renderMedicalReportPrint = async (req, res) => {
  try {
    const billing = await Billing.findOne({
      where: {
        id: req.params.id,
        ...buildBillingAccessWhere(req)
      },
      include: [{ model: Patient }]
    });

    if (!billing) {
      return res.status(404).render('error', {
        title: 'Error',
        message: 'Invoice not found'
      });
    }

    const report = await MedicalReport.findOne({ where: { BillingId: billing.id } });

    if (!report) {
      return res.redirect(`/billing/medical-report/${billing.id}`);
    }

    const reportData = reportToFormData(report, billing.Patient);
    const xrayImageUrl = resolveXrayImage(report.xrayImage);

    res.render('billing_medical_report_print', {
      title: 'Medical Report',
      billing,
      report,
      reportData,
      xrayImageUrl,
      fingerprintUrl: DEFAULT_FINGERPRINT_IMAGE,
      bloodBiochemistryTests: BLOOD_BIOCHEMISTRY_TESTS
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load medical report'
    });
  }
};

exports.getDefaultReportData = getDefaultReportData;

exports.renderMedicalReportHtmlForBundle = async (billing, settings, assetPaths = {}) => {
  const report = billing.MedicalReport
    || await MedicalReport.findOne({ where: { BillingId: billing.id } });

  if (!report) {
    return null;
  }

  const reportData = reportToFormData(report, billing.Patient);
  const xrayImageUrl = assetPaths.xray != null
    ? assetPaths.xray
    : resolveXrayImage(report.xrayImage);
  const fingerprintUrl = assetPaths.fingerprint != null
    ? assetPaths.fingerprint
    : DEFAULT_FINGERPRINT_IMAGE;
  const bundleProfileSrc = assetPaths.profile != null
    ? assetPaths.profile
    : billing.patientPhoto;

  return ejs.renderFile(
    path.join(__dirname, '../views/billing_medical_report_print.ejs'),
    {
      title: 'Medical Report',
      billing,
      patient: billing.Patient,
      report,
      reportData,
      xrayImageUrl,
      fingerprintUrl,
      bundleProfileSrc,
      bundleExport: true,
      pdfHeadExtras: getPdfExportHeadHtml(),
      settings: settings || {},
      bloodBiochemistryTests: BLOOD_BIOCHEMISTRY_TESTS
    }
  );
};

exports.renderMedicalReportPdfBuffer = async (billing, settings, browser) => {
  const report = billing.MedicalReport;
  const assetPaths = {
    profile: billing.patientPhoto
      ? storedPathToDataUri(billing.patientPhoto, PUBLIC_ROOT)
      : null,
    xray: storedPathToDataUri(report?.xrayImage, PUBLIC_ROOT)
      || storedPathToDataUri(DEFAULT_XRAY_IMAGE, PUBLIC_ROOT)
      || resolveXrayImage(report?.xrayImage),
    fingerprint: storedPathToDataUri(DEFAULT_FINGERPRINT_IMAGE, PUBLIC_ROOT)
      || DEFAULT_FINGERPRINT_IMAGE
  };
  const html = await exports.renderMedicalReportHtmlForBundle(billing, settings, assetPaths);

  if (!html) {
    return null;
  }

  return htmlToPdfBuffer(html, browser);
};
