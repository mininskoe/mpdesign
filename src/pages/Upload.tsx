import React, { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { UploadCloud, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { generateSlide, generateCategory } from '../lib/gemini';

export function Upload() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, deduct } = useAuth();
  const marketplace = location.state?.marketplace || 'ozon';
  
  const [images, setImages] = useState<{ url: string; file: File }[]>([]);
  const [description, setDescription] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const checkKey = async () => {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      if (!hasKey) {
        setShowKeyModal(true);
      }
    };
    checkKey();
  }, []);

  const handleOpenKey = async () => {
    await (window as any).aistudio.openSelectKey();
    setShowKeyModal(false);
  };

  React.useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files) as File[];
      if (images.length + newFiles.length > 10) {
        setError('Максимум 10 фотографий');
        return;
      }
      setError('');
      const newImages = newFiles.map(file => ({
        url: URL.createObjectURL(file),
        file
      }));
      setImages(prev => [...prev, ...newImages]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const toBase64 = (file: File) => new Promise<{ data: string, mimeType: string }>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve({ data: reader.result as string, mimeType: file.type });
    reader.onerror = error => reject(error);
  });

  const handleGenerate = async () => {
    if (images.length < 2) {
      setError('Загрузите минимум 2 фотографии');
      return;
    }
    if (!description.trim()) {
      setError('Добавьте описание товара');
      return;
    }
    
    if (!user) return;
    
    const cost = user.has_used_promo ? 500 : 100;
    if (user.balance < cost) {
      setError(`Недостаточно средств. Стоимость генерации: ${cost} ₽`);
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      await deduct(cost, `Генерация карточки (${marketplace})`, !user.has_used_promo);
      
      const base64Images = await Promise.all(images.map(img => toBase64(img.file)));
      
      const category = await generateCategory(description);
      const slideTypes = ['main', 'description', 'details', 'infographic', 'collage'] as const;
      const generatedSlides = [];
      
      for (const type of slideTypes) {
        const result = await generateSlide(
          marketplace as any,
          description,
          base64Images,
          type,
          userPrompt
        );
        generatedSlides.push(result);
      }
      
      const res = await fetch('/api/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          marketplace,
          description,
          styleWishes: userPrompt,
          category,
          originalImages: base64Images.map(img => img.data),
          slides: generatedSlides
        })
      });
      
      if (!res.ok) {
        throw new Error('Ошибка сохранения генерации');
      }
      
      const data = await res.json();
      navigate(`/result/${data.id}`);
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка');
      // Refund logic could be added here if generation fails
    } finally {
      setIsGenerating(false);
    }
  };

  if (!user) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Создание карточки для {marketplace === 'ozon' ? 'Ozon' : 'Wildberries'}
        </h1>
        <p className="text-zinc-500">
          Загрузите от 2 до 10 фотографий товара и добавьте подробное описание.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6 mb-6">
        <div className="mb-6">
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Фотографии товара ({images.length}/10)
          </label>
          
          <div 
            className="border-2 border-dashed border-zinc-300 rounded-xl p-8 text-center hover:bg-zinc-50 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud className="w-10 h-10 text-zinc-400 mx-auto mb-4" />
            <p className="text-sm text-zinc-600 font-medium">Нажмите для загрузки или перетащите файлы</p>
            <p className="text-xs text-zinc-400 mt-1">PNG, JPG до 10MB</p>
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileChange}
            />
          </div>

          {images.length > 0 && (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-4 mt-6">
              {images.map((img, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-zinc-200 group">
                  <img src={img.url} alt="preview" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Описание товара
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Опишите товар: материал, цвет, особенности, преимущества..."
            className="w-full h-32 p-3 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none mb-4"
          />
          
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Пожелания по стилю (необязательно)
          </label>
          <input
            type="text"
            value={userPrompt}
            onChange={e => setUserPrompt(e.target.value)}
            placeholder="Например: минимализм, неоновые цвета, скандинавский стиль..."
            className="w-full p-3 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm mb-6">
            {error}
          </div>
        )}

        {showKeyModal && (
          <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-sm mb-6 flex flex-col gap-3">
            <p className="font-medium">Для генерации изображений необходимо выбрать API-ключ с платной подпиской.</p>
            <p className="text-xs">Это требование модели Gemini 3 Pro Image. Выберите ключ в настройках или нажмите кнопку ниже.</p>
            <button 
              onClick={handleOpenKey}
              className="bg-amber-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-amber-700 transition-colors w-fit"
            >
              Выбрать API-ключ
            </button>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Генерация 5 слайдов...
            </>
          ) : (
            <>
              <ImageIcon className="w-5 h-5" />
              Сгенерировать ({user?.has_used_promo ? '500' : '100'} ₽)
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
