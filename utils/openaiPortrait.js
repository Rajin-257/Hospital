const path = require('path');
const fs = require('fs');
const { Blob } = require('buffer');
const sharp = require('sharp');

const AI_PORTRAIT_OUTPUT_SIZE = parseInt(process.env.AI_PORTRAIT_SIZE || '200', 10);

const AI_PORTRAIT_PROMPT = [
  'You are given two reference images: image 1 is a person (the subject), image 2 is a background scene.',
  'Composite the person from image 1 onto the background from image 2.',
  'Preserve the exact face, hairstyle, skin tone, and shirt color/design of the person from image 1.',
  'Do NOT change the background — use the exact background from image 2 as-is behind the person.',
  'The final result is a realistic upper-body portrait: the person facing the camera naturally, seamlessly placed in front of the image 2 background.',
  'Ultra realistic, professional photography, sharp focus, natural lighting consistent with the background, high quality, 4K.'
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

async function generateAiPortrait(profileImagePath, options = {}) {
  console.log('\n[AI Portrait] ── START ──────────────────────────────');

  const apiKey = process.env.gpt_api_key || process.env.GPT_API_KEY || process.env.OPENAI_API_KEY;
  console.log('[AI Portrait] API key present:', !!apiKey);

  if (!apiKey) {
    throw new Error('GPT API key is not configured. Set gpt_api_key in your .env file.');
  }

  console.log('[AI Portrait] Profile image path :', profileImagePath);
  console.log('[AI Portrait] Profile image exists:', fs.existsSync(profileImagePath));

  if (!fs.existsSync(profileImagePath)) {
    throw new Error('Profile image file not found');
  }

  const usingCustomBg = !!(options.bgImagePath && fs.existsSync(options.bgImagePath));
  const bgPath = usingCustomBg ? options.bgImagePath : BACKGROUND_IMAGE_PATH;

  console.log('[AI Portrait] BG path (custom=' + usingCustomBg + '):', bgPath);
  console.log('[AI Portrait] BG file exists        :', fs.existsSync(bgPath));

  if (!fs.existsSync(bgPath)) {
    throw new Error('Background image not found in public folder');
  }

  const usingCustomPrompt = !!(options.prompt && options.prompt.trim());
  const prompt = usingCustomPrompt ? options.prompt.trim() : AI_PORTRAIT_PROMPT;

  console.log('[AI Portrait] Using custom prompt   :', usingCustomPrompt);
  console.log('[AI Portrait] Prompt sent to OpenAI :\n', prompt);

  const form = new FormData();
  form.append('model', 'gpt-image-2');
  form.append('prompt', prompt);
  form.append('size', '1024x1024');
  form.append('quality', 'low');
  appendImageToForm(form, profileImagePath, `profile${path.extname(profileImagePath) || '.png'}`);
  appendImageToForm(form, bgPath, path.basename(bgPath));

  console.log('[AI Portrait] Sending request to OpenAI /images/edits …');

  const response = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: form
  });

  console.log('[AI Portrait] OpenAI HTTP status    :', response.status, response.statusText);

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const apiMessage = payload?.error?.message || payload?.message || `OpenAI API error (${response.status})`;
    console.error('[AI Portrait] OpenAI error response:', JSON.stringify(payload, null, 2));
    throw new Error(apiMessage);
  }

  console.log('[AI Portrait] Response keys         :', Object.keys(payload));
  console.log('[AI Portrait] data[0] keys          :', payload?.data?.[0] ? Object.keys(payload.data[0]) : 'none');

  const item = payload?.data?.[0];
  if (!item) {
    throw new Error('OpenAI did not return an image');
  }

  let imageBuffer = null;
  if (item.b64_json) {
    console.log('[AI Portrait] Image returned as     : b64_json (' + item.b64_json.length + ' chars)');
    imageBuffer = Buffer.from(item.b64_json, 'base64');
  } else if (item.url) {
    console.log('[AI Portrait] Image returned as     : URL', item.url);
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

  console.log('[AI Portrait] Raw image buffer size :', imageBuffer.length, 'bytes');

  const resized = sharp(imageBuffer).resize(AI_PORTRAIT_OUTPUT_SIZE, AI_PORTRAIT_OUTPUT_SIZE, {
    fit: 'cover',
    position: 'centre'
  });

  const [png, jpg] = await Promise.all([
    resized.clone().png().toBuffer(),
    resized.clone().jpeg({ quality: 92 }).toBuffer()
  ]);

  console.log('[AI Portrait] Resized PNG size        :', png.length, 'bytes');
  console.log('[AI Portrait] Resized JPG size        :', jpg.length, 'bytes (' + AI_PORTRAIT_OUTPUT_SIZE + 'x' + AI_PORTRAIT_OUTPUT_SIZE + ')');
  console.log('[AI Portrait] ── DONE ───────────────────────────────\n');

  return { png, jpg };
}

module.exports = {
  AI_PORTRAIT_PROMPT,
  AI_PORTRAIT_OUTPUT_SIZE,
  BACKGROUND_IMAGE_PATH,
  generateAiPortrait
};
