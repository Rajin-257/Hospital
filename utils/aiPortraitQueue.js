const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const Billing = require('../models/Billing');
const User = require('../models/User');
const AiPortraitJob = require('../models/AiPortraitJob');
const { generateAiPortrait } = require('./openaiPortrait');

const BILLING_PHOTOS_DIR = path.join(__dirname, '../public/uploads/billing_photos');

let queueRunning = false;

function hasExistingAiPortrait(billing) {
  if (!billing?.patientPhoto) {
    return false;
  }

  if (!/\/billing_photos\/ai-\d+-/i.test(billing.patientPhoto)) {
    return false;
  }

  const filePath = path.join(__dirname, '../public', billing.patientPhoto.replace(/^\//, ''));
  return fs.existsSync(filePath);
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

async function generateAiPortraitForBilling(billing, user) {
  if (!billing.takenPhoto) {
    throw new Error('No taken photo available for this billing');
  }

  const profileImagePath = path.join(__dirname, '../public', billing.takenPhoto);
  if (!fs.existsSync(profileImagePath)) {
    throw new Error('Taken photo file not found on server');
  }

  const bgImagePath = user.hospitalBg
    ? path.join(__dirname, '../public', user.hospitalBg)
    : null;

  const portraitBuffers = await generateAiPortrait(profileImagePath, {
    bgImagePath: bgImagePath || undefined,
    prompt: user.aiPrompt || undefined
  });

  const { imageUrl, imageUrlJpg } = saveAiPortraitFiles(billing.id, portraitBuffers);
  await billing.update({ patientPhoto: imageUrl });

  return { imageUrl, imageUrlJpg };
}

async function processJob(job) {
  await job.update({ status: 'processing', errorMessage: null });

  try {
    const billing = await Billing.findByPk(job.billingId);
    if (!billing) {
      await job.update({ status: 'failed', errorMessage: 'Billing not found' });
      return;
    }

    if (!billing.takenPhoto) {
      await job.update({ status: 'skipped', errorMessage: 'No taken photo available' });
      return;
    }

    if (hasExistingAiPortrait(billing)) {
      await job.update({
        status: 'skipped',
        imageUrl: billing.patientPhoto,
        imageUrlJpg: billing.patientPhoto.replace(/\.png$/i, '.jpg'),
        errorMessage: 'AI portrait already exists'
      });
      return;
    }

    const user = await User.findByPk(job.userId, {
      attributes: ['id', 'hospitalBg', 'aiPrompt']
    });
    if (!user) {
      await job.update({ status: 'failed', errorMessage: 'User not found' });
      return;
    }

    const { imageUrl, imageUrlJpg } = await generateAiPortraitForBilling(billing, user);
    await job.update({ status: 'completed', imageUrl, imageUrlJpg, errorMessage: null });
  } catch (error) {
    console.error(`[AI Portrait Queue] Job ${job.id} failed:`, error);
    await job.update({
      status: 'failed',
      errorMessage: error.message || 'Failed to generate AI portrait'
    });
  }
}

async function processAiPortraitQueue() {
  if (queueRunning) {
    return;
  }

  queueRunning = true;

  try {
    while (true) {
      const job = await AiPortraitJob.findOne({
        where: { status: 'pending' },
        order: [['createdAt', 'ASC']]
      });

      if (!job) {
        break;
      }

      await processJob(job);
    }
  } finally {
    queueRunning = false;

    const pendingCount = await AiPortraitJob.count({ where: { status: 'pending' } });
    if (pendingCount > 0) {
      setImmediate(() => {
        processAiPortraitQueue().catch((err) => {
          console.error('[AI Portrait Queue] Resume error:', err);
        });
      });
    }
  }
}

async function enqueueBulkAiPortraits(billingIds, userId) {
  const uniqueIds = [...new Set(
    (Array.isArray(billingIds) ? billingIds : [])
      .map((id) => parseInt(id, 10))
      .filter((id) => !Number.isNaN(id))
  )];

  if (!uniqueIds.length) {
    return { batchId: null, queued: 0, skipped: 0 };
  }

  const batchId = uuidv4();
  const bills = await Billing.findAll({
    where: { id: { [Op.in]: uniqueIds } }
  });
  const billMap = new Map(bills.map((bill) => [bill.id, bill]));

  const jobs = [];
  let skipped = 0;

  for (const billingId of uniqueIds) {
    const billing = billMap.get(billingId);
    if (!billing) {
      skipped += 1;
      continue;
    }

    if (!billing.takenPhoto) {
      jobs.push({
        batchId,
        billingId,
        userId,
        status: 'skipped',
        errorMessage: 'No taken photo available'
      });
      skipped += 1;
      continue;
    }

    if (hasExistingAiPortrait(billing)) {
      jobs.push({
        batchId,
        billingId,
        userId,
        status: 'skipped',
        imageUrl: billing.patientPhoto,
        imageUrlJpg: billing.patientPhoto.replace(/\.png$/i, '.jpg'),
        errorMessage: 'AI portrait already exists'
      });
      skipped += 1;
      continue;
    }

    jobs.push({
      batchId,
      billingId,
      userId,
      status: 'pending'
    });
  }

  if (jobs.length) {
    await AiPortraitJob.bulkCreate(jobs);
  }

  const queued = jobs.filter((job) => job.status === 'pending').length;
  const alreadyHasAi = jobs.filter((job) => job.errorMessage === 'AI portrait already exists').length;

  if (queued > 0) {
    setImmediate(() => {
      processAiPortraitQueue().catch((err) => {
        console.error('[AI Portrait Queue] Start error:', err);
      });
    });
  }

  return { batchId, queued, skipped, alreadyHasAi, total: uniqueIds.length };
}

async function getBatchStatus(batchId, userId) {
  const jobs = await AiPortraitJob.findAll({
    where: { batchId, userId },
    order: [['id', 'ASC']]
  });

  if (!jobs.length) {
    return null;
  }

  const summary = {
    batchId,
    total: jobs.length,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    skipped: 0,
    jobs: jobs.map((job) => ({
      billingId: job.billingId,
      status: job.status,
      imageUrl: job.imageUrl,
      imageUrlJpg: job.imageUrlJpg,
      errorMessage: job.errorMessage
    }))
  };

  jobs.forEach((job) => {
    summary[job.status] += 1;
  });

  summary.done = summary.pending === 0 && summary.processing === 0;
  return summary;
}

function resumeAiPortraitQueue() {
  AiPortraitJob.update(
    { status: 'pending' },
    { where: { status: 'processing' } }
  ).finally(() => {
    setImmediate(() => {
      processAiPortraitQueue().catch((err) => {
        console.error('[AI Portrait Queue] Startup resume error:', err);
      });
    });
  });
}

module.exports = {
  enqueueBulkAiPortraits,
  getBatchStatus,
  processAiPortraitQueue,
  resumeAiPortraitQueue,
  generateAiPortraitForBilling,
  hasExistingAiPortrait
};
