const path = require('path');
const fs = require('fs');
const { Blob } = require('buffer');
const sharp = require('sharp');

const AI_PORTRAIT_OUTPUT_SIZE = parseInt(process.env.AI_PORTRAIT_SIZE || '200', 10);

const AI_PORTRAIT_PROMPT = [
  'Create a realistic half of upper body with Face portrait using the uploaded reference photo.',
  'Keep the same person, same face, same hairstyle, and especially the exact same shirt color/design from the original image.',
  'The person is standing in a modern medical clinic waiting room, facing the camera naturally like a professional ID or passport-style photo.',
  'Background includes clean hospital interior, waiting chairs, medical posters, bright ceiling lights, and realistic indoor lighting.',
  'Ultra realistic, professional photography, sharp focus, detailed skin texture, natural pose, high quality, 4k'
].join(' ');

const BACKGROUND_IMAGE_PATH = path.join(__dirname, '../public/bg-gpt.png');

function mimeForPath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

function appendImageToForm(form, filePath, filename) {
  const buffer = fs.readFileSync(filePath);
  const mime = mimeForPath(filePath);
  form.append('image[]', new Blob([buffer], { type: mime }), filename);
}

async function generateAiPortrait(profileImagePath) {
  const apiKey = process.env.gpt_api_key || process.env.GPT_API_KEY || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('GPT API key is not configured. Set gpt_api_key in your .env file.');
  }

  if (!fs.existsSync(profileImagePath)) {
    throw new Error('Profile image file not found');
  }

  if (!fs.existsSync(BACKGROUND_IMAGE_PATH)) {
    throw new Error('Background image (bg-gpt.png) not found in public folder');
  }

  const form = new FormData();
  form.append('model', 'gpt-image-2');
  form.append('prompt', AI_PORTRAIT_PROMPT);
  form.append('size', '1024x1024');
  form.append('quality', 'low');
  appendImageToForm(form, profileImagePath, `profile${path.extname(profileImagePath) || '.png'}`);
  appendImageToForm(form, BACKGROUND_IMAGE_PATH, 'bg-gpt.png');

  const response = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: form
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const apiMessage = payload?.error?.message || payload?.message || `OpenAI API error (${response.status})`;
    throw new Error(apiMessage);
  }

  const item = payload?.data?.[0];
  if (!item) {
    throw new Error('OpenAI did not return an image');
  }

  let imageBuffer = null;
  if (item.b64_json) {
    imageBuffer = Buffer.from(item.b64_json, 'base64');
  } else if (item.url) {
    const imageRes = await fetch(item.url);
    if (!imageRes.ok) {
      throw new Error('Failed to download generated image from OpenAI');
    }
    const arrayBuffer = await imageRes.arrayBuffer();
    imageBuffer = Buffer.from(arrayBuffer);
  }

  if (!imageBuffer) {
    throw new Error('OpenAI did not return image data');
  }

  return sharp(imageBuffer)
    .resize(AI_PORTRAIT_OUTPUT_SIZE, AI_PORTRAIT_OUTPUT_SIZE, {
      fit: 'cover',
      position: 'centre'
    })
    .png()
    .toBuffer();
}

module.exports = {
  AI_PORTRAIT_PROMPT,
  AI_PORTRAIT_OUTPUT_SIZE,
  BACKGROUND_IMAGE_PATH,
  generateAiPortrait
};
