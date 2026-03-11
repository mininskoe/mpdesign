import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

let apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

// Try to read from .env if not in process.env
if (!apiKey) {
  try {
    const envFile = fs.readFileSync('.env', 'utf8');
    const match = envFile.match(/GEMINI_API_KEY=(.*)/);
    if (match) apiKey = match[1].replace(/['"]/g, '').trim();
  } catch (e) {}
}

if (!apiKey) {
  throw new Error('GEMINI_API_KEY is not set');
}

const ai = new GoogleGenAI({ apiKey });
const db = new Database('app.db');

async function generateImage(prompt: string, aspectRatio = "3:4"): Promise<string> {
  console.log(`Generating: ${prompt}`);
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-image-preview',
    contents: prompt,
    config: {
      imageConfig: {
        aspectRatio: aspectRatio as any,
        imageSize: "1K"
      }
    }
  });
  
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
}

async function run() {
  db.prepare("DELETE FROM generations WHERE user_id = 'system'").run();
  db.prepare("DELETE FROM slides WHERE generation_id NOT IN (SELECT id FROM generations)").run();

  const examples = [
    {
      id: 'example-1',
      marketplace: 'ozon',
      description: 'Беспроводные наушники с шумоподавлением, премиальный дизайн. Отличное качество звука, глубокие басы.',
      original_prompt: 'A raw studio photo of premium black wireless over-ear headphones on a plain white background, high resolution, product photography',
      slides: [
        { prompt: 'Product card for Ozon marketplace. Main slide. Premium black wireless headphones. Bold modern typography, neon accents. Text "Premium Audio", "Беспроводные наушники". High quality 3D render style.' },
        { prompt: 'Product card for Ozon marketplace. Infographics slide. Black wireless headphones. Icons showing: 30 hours battery, Bluetooth 5.0, Active Noise Cancellation. Clean layout, dark theme.' },
        { prompt: 'Product card for Ozon marketplace. Detail slide. Macro shot of the soft ear pads of black wireless headphones. Text highlighting comfort and eco-leather material.' },
        { prompt: 'Product card for Ozon marketplace. Lifestyle slide. A stylish young man wearing black wireless headphones walking in a sunny city. Text "Идеально для города".' },
        { prompt: 'Product card for Ozon marketplace. Lifestyle slide. A woman focused on her laptop in a cozy cafe, wearing black wireless headphones. Text "Полное погружение".' }
      ]
    },
    {
      id: 'example-2',
      marketplace: 'wildberries',
      description: 'Увлажняющий крем для лица с гиалуроновой кислотой. Легкая текстура, быстро впитывается.',
      original_prompt: 'A raw studio photo of a sleek white cosmetic jar of face cream on a plain white background, high resolution, product photography',
      slides: [
        { prompt: 'Product card for Wildberries marketplace. Main slide. A sleek white jar of face cream surrounded by water splashes and fresh aloe leaves. Text "Увлажняющий крем", "Гиалуроновая кислота". Light blue and white color palette.' },
        { prompt: 'Product card for Wildberries marketplace. Infographics slide. Face cream jar. Icons showing: 24h hydration, natural ingredients, fast absorption. Clean elegant layout.' },
        { prompt: 'Product card for Wildberries marketplace. Texture slide. Close up of the creamy, light texture of the face cream smeared on a glass surface. Text "Легкая текстура".' },
        { prompt: 'Product card for Wildberries marketplace. Lifestyle slide. A beautiful woman with glowing, hydrated skin smiling. Text "Сияющая кожа каждый день".' },
        { prompt: 'Product card for Wildberries marketplace. Benefit slide. Before and after concept showing dry skin vs hydrated skin using water drop graphics. Text "Мгновенное увлажнение".' }
      ]
    }
  ];

  for (const ex of examples) {
    try {
      console.log(`Starting example: ${ex.id}`);
      const origImage = await generateImage(ex.original_prompt, "1:1");
      
      db.prepare('INSERT INTO generations (id, user_id, marketplace, description, original_images) VALUES (?, ?, ?, ?, ?)')
        .run(ex.id, 'system', ex.marketplace, ex.description, JSON.stringify([origImage]));
        
      for (let i = 0; i < ex.slides.length; i++) {
        const slideImage = await generateImage(ex.slides[i].prompt, "3:4");
        db.prepare('INSERT INTO slides (id, generation_id, slide_index, image_url, prompt) VALUES (?, ?, ?, ?, ?)')
          .run(uuidv4(), ex.id, i, slideImage, ex.slides[i].prompt);
      }
      console.log(`Completed example ${ex.id}`);
    } catch (e) {
      console.error(`Failed example ${ex.id}`, e);
    }
  }
}

run();
