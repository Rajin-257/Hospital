const bwipjs = require('bwip-js');
const sharp = require('sharp');

const BARCODE_DISPLAY_WIDTH = 140;

function buildInvoiceBarcodeValue(billing) {
  const invoiceNo = String(billing?.billNumber || billing?.id || '').trim();
  const patientId = String(billing?.Patient?.patientId || '').trim();
  return `${invoiceNo}|${patientId}`;
}

async function generateInvoiceBarcodeDataUri(barcodeValue) {
  const text = String(barcodeValue || '').trim();
  if (!text) {
    return null;
  }

  const png = await bwipjs.toBuffer({
    bcid: 'code128',
    text,
    scale: 3,
    height: 20,
    includetext: false,
    paddingwidth: 14,
    paddingheight: 4,
    backgroundcolor: 'FFFFFF'
  });

  const resized = await sharp(png)
    .resize({
      width: BARCODE_DISPLAY_WIDTH,
      kernel: sharp.kernel.nearest
    })
    .png()
    .toBuffer();

  return `data:image/png;base64,${resized.toString('base64')}`;
}

async function buildInvoiceBarcodeForBilling(billing) {
  const value = buildInvoiceBarcodeValue(billing);
  const dataUri = await generateInvoiceBarcodeDataUri(value);
  return { value, dataUri };
}

module.exports = {
  BARCODE_DISPLAY_WIDTH,
  buildInvoiceBarcodeValue,
  generateInvoiceBarcodeDataUri,
  buildInvoiceBarcodeForBilling
};
