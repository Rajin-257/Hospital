const puppeteer = require('puppeteer');

async function launchPdfBrowser() {
  return puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
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

async function htmlToPdfBuffer(html, browser) {
  const page = await browser.newPage();
  try {
    await page.setContent(html, {
      waitUntil: 'load',
      timeout: 90000
    });
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
  htmlToPdfBuffer
};
