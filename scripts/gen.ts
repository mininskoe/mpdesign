import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });

const examples = [
  {
    id: 'example-1',
    marketplace: 'ozon',
    originalPrompt: 'Беспроводные наушники с шумоподавлением, студийное фото на белом фоне, высокое разрешение, предметная съемка',
    prompts: [
      'Главный продающий слайд для карточки товара. Крупный план беспроводных наушников, привлекающий внимание фон, яркие цвета, высокое качество.',
      'Слайд с характеристиками товара. Беспроводные наушники показаны с инфографикой, иконками или выносками (без текста, только визуальные акценты), чистый фон.',
      'Слайд с детальным описанием товара. Беспроводные наушники в красивом окружении, показывающий его качество и материалы.',
      'Беспроводные наушники в реальной жизни, lifestyle фото. Человек использует товар или товар находится в естественной среде обитания.',
      'Беспроводные наушники в реальной жизни, другой ракурс или сценарий использования. Естественное освещение, реалистично.'
    ]
  },
  {
    id: 'example-2',
    marketplace: 'wildberries',
    originalPrompt: 'Стильная базовая футболка, студийное фото на белом фоне, предметная съемка одежды',
    prompts: [
      'Главный продающий слайд для карточки товара. Крупный план базовой футболки на модели, привлекающий внимание фон, яркие цвета, высокое качество.',
      'Слайд с характеристиками товара. Футболка показана с инфографикой, иконками или выносками (без текста, только визуальные акценты), чистый фон.',
      'Слайд с детальным описанием товара. Футболка в красивом окружении, показывающий качество ткани и швов.',
      'Футболка в реальной жизни, lifestyle фото. Человек в футболке на улице, естественная среда.',
      'Футболка в реальной жизни, другой ракурс. Естественное освещение, реалистично.'
    ]
  },
  {
    id: 'example-3',
    marketplace: 'ozon',
    originalPrompt: 'Развивающий конструктор для детей, детали конструктора, студийное фото на белом фоне',
    prompts: [
      'Главный продающий слайд для карточки товара. Крупный план детского конструктора, привлекающий внимание фон, яркие цвета, высокое качество.',
      'Слайд с характеристиками товара. Конструктор показан с инфографикой, иконками или выносками (без текста, только визуальные акценты), чистый фон.',
      'Слайд с детальным описанием товара. Детали конструктора крупным планом, показывающий качество пластика и безопасность.',
      'Детский конструктор в реальной жизни, lifestyle фото. Ребенок играет с конструктором в детской комнате.',
      'Детский конструктор в реальной жизни, другой ракурс. Естественное освещение, радостная атмосфера.'
    ]
  },
  {
    id: 'example-4',
    marketplace: 'wildberries',
    originalPrompt: 'Мужские наручные часы с кожаным ремешком, студийное фото на белом фоне, предметная съемка',
    prompts: [
      'Главный продающий слайд для карточки товара. Крупный план мужских наручных часов, привлекающий внимание темный фон, премиальное качество.',
      'Слайд с характеристиками товара. Часы показаны с инфографикой, иконками или выносками (без текста, только визуальные акценты), чистый фон.',
      'Слайд с детальным описанием товара. Часы крупным планом, показывающий качество циферблата и кожаного ремешка.',
      'Мужские часы в реальной жизни, lifestyle фото. Часы на руке мужчины в деловом костюме.',
      'Мужские часы в реальной жизни, другой ракурс. Естественное освещение, реалистично.'
    ]
  }
];

async function generateImage(prompt: string, filepath: string, aspectRatio: string) {
  if (fs.existsSync(filepath)) {
    console.log(`Skipping ${filepath}, already exists.`);
    return;
  }
  console.log(`Generating ${filepath}...`);
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: prompt,
      config: {
        imageConfig: {
          aspectRatio,
          imageSize: '1K'
        }
      }
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const buffer = Buffer.from(part.inlineData.data, 'base64');
        fs.writeFileSync(filepath, buffer);
        console.log(`Saved ${filepath}`);
        break;
      }
    }
  } catch (e) {
    console.error(`Failed to generate ${filepath}:`, e);
  }
}

async function main() {
  if (!fs.existsSync('public/examples')) {
    fs.mkdirSync('public/examples', { recursive: true });
  }

  const tasks: (() => Promise<void>)[] = [];

  for (const ex of examples) {
    const aspectRatio = ex.marketplace === 'ozon' ? '1:1' : '3:4';
    
    tasks.push(() => generateImage(ex.originalPrompt, `public/examples/${ex.id}-original.jpg`, aspectRatio));
    
    for (let i = 0; i < ex.prompts.length; i++) {
      tasks.push(() => generateImage(ex.prompts[i], `public/examples/${ex.id}-slide-${i}.jpg`, aspectRatio));
    }
  }

  // Run 4 in parallel
  const concurrency = 4;
  for (let i = 0; i < tasks.length; i += concurrency) {
    const chunk = tasks.slice(i, i + concurrency);
    await Promise.all(chunk.map(t => t()));
  }
  
  console.log('Done generating examples!');
}

main();
