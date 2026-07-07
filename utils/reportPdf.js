const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

function pathExists(candidate) {
  return typeof candidate === 'string' && candidate.length > 0 && fs.existsSync(candidate);
}

function getPlatformChromeCandidates() {
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || '';
    const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

    return [
      path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe')
    ];
  }

  if (process.platform === 'darwin') {
    return [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
    ];
  }

  return [
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/snap/bin/chromium'
  ];
}

async function resolveChromeExecutable() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
    ...getPlatformChromeCandidates()
  ];

  for (const candidate of candidates) {
    if (pathExists(candidate)) {
      return candidate;
    }
  }

  try {
    const bundled = await puppeteer.executablePath();
    if (pathExists(bundled)) {
      return bundled;
    }
  } catch (err) {
    // Bundled Chrome not installed
  }

  return null;
}

function buildLaunchError(originalError) {
  const isWindows = process.platform === 'win32';
  const hint = isWindows
    ? 'Install Google Chrome or Microsoft Edge, or run: npm run install-chrome — then restart the app.'
    : 'Install Chromium (e.g. sudo apt install chromium-browser) and set PUPPETEER_EXECUTABLE_PATH in .env, or run: npm run install-chrome — then restart the app.';

  return new Error(
    `PDF generation needs Chrome/Chromium on this server. ${hint} (${originalError.message})`
  );
}

async function launchPdfBrowser() {
  const executablePath = await resolveChromeExecutable();
  const launchOptions = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  };

  const savedEnvPath = process.env.PUPPETEER_EXECUTABLE_PATH;
  const envPathInvalid = savedEnvPath && !pathExists(savedEnvPath);

  if (executablePath) {
    launchOptions.executablePath = executablePath;
  } else if (envPathInvalid) {
    delete process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  try {
    return await puppeteer.launch(launchOptions);
  } catch (err) {
    throw buildLaunchError(err);
  } finally {
    if (envPathInvalid) {
      if (savedEnvPath !== undefined) {
        process.env.PUPPETEER_EXECUTABLE_PATH = savedEnvPath;
      }
    }
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
