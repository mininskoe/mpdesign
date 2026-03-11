import { GoogleGenAI } from '@google/genai';

export async function generateOriginalImage(prompt: string, marketplace: 'ozon' | 'wildberries') {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
  const aspectRatio = marketplace === 'ozon' ? '1:1' : '3:4';
  
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

  let imageUrl = '';
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      break;
    }
  }

  if (!imageUrl) {
    throw new Error('Не удалось сгенерировать изображение');
  }

  return imageUrl;
}

export async function generateSlide(
  marketplace: 'ozon' | 'wildberries',
  description: string,
  images: { data: string; mimeType: string }[],
  slideType: 'main' | 'description' | 'details' | 'infographic' | 'collage',
  userPrompt?: string
) {
  // Create a new instance right before making an API call to ensure it uses the most up-to-date API key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
  
  const aspectRatio = marketplace === 'ozon' ? '1:1' : '3:4';
  
  let basePrompt = '';
  let styleInstruction = '';
  
  // First 4 slides should be consistent in style
  if (['main', 'description', 'details', 'infographic'].includes(slideType)) {
    styleInstruction = 'Соблюдай единый стиль, цветовую гамму и композицию с другими слайдами этой серии. ';
  }

  switch (slideType) {
    case 'main':
      basePrompt = 'Главный продающий слайд для карточки товара. Крупный план товара, привлекающий внимание фон, яркие цвета, высокое качество. ';
      break;
    case 'description':
      basePrompt = 'Второй продающий слайд. Высококачественная рекламная съемка товара в стильном, дорогом интерьере или профессиональной студии. Мягкое студийное освещение, высокая детализация, элегантная композиция. Добавь на изображение краткое, привлекательное текстовое описание товара. Используй русский язык для описания, но сохрани оригинальные названия брендов или моделей на английском, если они указаны так в описании. ';
      break;
    case 'details':
      basePrompt = 'Третий слайд. Фокус на деталях. Добавь на изображение подробный список характеристик или преимуществ товара. Используй русский язык для текста, но сохрани оригинальные названия брендов или моделей на английском, если они указаны так в описании. ';
      break;
    case 'infographic':
      basePrompt = 'Четвертый слайд. Профессиональная инфографика. Товар показан с иконками и лаконичными текстовыми подписями, раскрывающими преимущества. ВСЕ НАДПИСИ НА ЭТОМ СЛАЙДЕ ДОЛЖНЫ БЫТЬ СТРОГО НА РУССКОМ ЯЗЫКЕ. ';
      break;
    case 'collage':
      basePrompt = 'Пятый слайд. Коллаж из 3-4 фотографий товара в реальной жизни (lifestyle). Покажи товар в разных сценариях использования, естественное освещение, реалистично. Сделай это в виде стильной сетки или коллажа. ';
      break;
  }
  
  const finalPrompt = `${styleInstruction}${basePrompt} 
  ИНФОРМАЦИЯ ДЛЯ ТЕКСТА: ${description}. 
  ${slideType === 'infographic' ? 'ВАЖНО: На этом слайде используй ТОЛЬКО РУССКИЙ ЯЗЫК, никаких английских слов.' : 'Используй русский язык для основного текста, но сохраняй специфические названия и бренды на английском, если это уместно.'}
  ${userPrompt && slideType !== 'collage' ? `Стиль и пожелания: ${userPrompt}` : ''}`;

  const parts: any[] = images.map(img => ({
    inlineData: {
      data: img.data.split(',')[1], // Remove data:image/jpeg;base64,
      mimeType: img.mimeType
    }
  }));
  
  parts.push({ text: finalPrompt });

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts },
    config: {
      imageConfig: {
        aspectRatio,
        imageSize: '1K'
      }
    }
  });

  let imageUrl = '';
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      break;
    }
  }

  if (!imageUrl) {
    throw new Error('Не удалось сгенерировать изображение');
  }

  return { imageUrl, prompt: finalPrompt };
}

export async function generateCategory(description: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Определи категорию товара по описанию. Ответь только одним или двумя словами (например: Электроника, Одежда, Обувь, Игрушки). Описание: ${description}`,
  });

  return response.text?.trim() || 'Товар';
}
