const fs = require('fs');
const puppeteer = require('puppeteer');

const CHROME_CANDIDATE_PATHS = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  process.env.CHROME_PATH,
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/snap/bin/chromium'
];

function resolveChromeExecutable() {
  for (const candidate of CHROME_CANDIDATE_PATHS) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  try {
    const bundled = puppeteer.executablePath();
    if (bundled && fs.existsSync(bundled)) {
      return bundled;
    }
  } catch (err) {
    // Bundled Chrome not installed (common on Linux servers)
  }

  return null;
}

function buildLaunchError(originalError) {
  return new Error(
    'PDF generation needs Chrome/Chromium on this server. ' +
    'Install it (e.g. sudo apt install chromium-browser) and set PUPPETEER_EXECUTABLE_PATH in .env, ' +
    'or run: npx puppeteer browsers install chrome — then restart the app. ' +
    `(${originalError.message})`
  );
}

async function launchPdfBrowser() {
  const executablePath = resolveChromeExecutable();
  const launchOptions = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  };

  if (executablePath) {
    launchOptions.executablePath = executablePath;
  }

  try {
    return await puppeteer.launch(launchOptions);
  } catch (err) {
    if (executablePath || !/Could not find Chrome/i.test(err.message)) {
      throw buildLaunchError(err);
    }

    throw buildLaunchError(err);
  }
}

async function waitForImages(page) {
  await page.evaluate(async () => {
    const images = Array.from(document.images);
    await Promise.all(images.map((img) => {
      if (img.complete && img.naturalWidth > 0) {
        return undefined;
      }
      return new Promise((resolve) => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
        setTimeout(resolve, 5000);
      });
    }));
  });
}

async function waitForFonts(page) {
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
  });
}

async function htmlToPdfBuffer(html, browser) {
  const page = await browser.newPage();
  try {
    await page.emulateMediaType('print');
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 120000
    });
    await waitForFonts(page);
    await waitForImages(page);
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '8mm',
        right: '8mm',
        bottom: '8mm',
        left: '8mm'
      }
    });

    return Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf);
  } finally {
    await page.close();
  }
}

module.exports = {
  launchPdfBrowser,
  htmlToPdfBuffer,
  resolveChromeExecutable
};
