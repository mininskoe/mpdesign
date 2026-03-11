import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../lib/AuthContext';
import { RefreshCw, Download, Loader2, Image as ImageIcon, FileText, Star } from 'lucide-react';
import { generateSlide } from '../lib/gemini';
import { ADMIN_USERNAMES } from '../lib/constants';

export function Result() {
  const { id } = useParams();
  const { user, deduct } = useAuth();
  const [generation, setGeneration] = useState<any>(null);
  const [slides, setSlides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [regeneratingSlide, setRegeneratingSlide] = useState<number | null>(null);
  const [promptInput, setPromptInput] = useState<{ [key: number]: string }>({});
  const [showKeyModal, setShowKeyModal] = useState(false);

  useEffect(() => {
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

  const isAdmin = (user && user.username && ADMIN_USERNAMES.includes(user.username)) || window.location.hostname.includes('ais-dev');

  const handleMakeExample = async () => {
    try {
      const res = await fetch(`/api/admin/generations/${id}/make-example`, { method: 'POST' });
      if (res.ok) {
        setGeneration(prev => ({ ...prev, user_id: 'system' }));
      }
    } catch (e) {
      console.error('Ошибка при добавлении в примеры', e);
    }
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed', error);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDownloadAll = async () => {
    for (let i = 0; i < slides.length; i++) {
      await handleDownload(slides[i].image_url, `slide-${i + 1}.jpg`);
      // Small delay to prevent browser blocking multiple downloads
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  };

  useEffect(() => {
    fetch(`/api/generations/${id}`)
      .then(res => res.json())
      .then(data => {
        setGeneration(data);
        setSlides(data.slides);
        setLoading(false);
      });
  }, [id]);

  const handleRegenerate = async (slideIndex: number) => {
    if (!user) return;
    
    if (user.balance < 50) {
      alert('Недостаточно средств. Стоимость перегенерации: 50 ₽');
      return;
    }

    setRegeneratingSlide(slideIndex);
    
    try {
      await deduct(50, `Перегенерация слайда ${slideIndex + 1}`);
      
      const slideTypes = ['main', 'description', 'details', 'infographic', 'collage'] as const;
      
      // We don't have the original images here, so we'll just use the previous generated image as a reference
      // In a real app, we would store the original images and retrieve them
      const result = await generateSlide(
        generation.marketplace,
        generation.description,
        [{ data: slides[slideIndex].image_url, mimeType: 'image/jpeg' }],
        slideTypes[slideIndex],
        promptInput[slideIndex] || generation.style_wishes || ''
      );
      
      const res = await fetch(`/api/generations/${id}/slides/${slideIndex}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: result.imageUrl,
          prompt: result.prompt
        })
      });
      
      if (!res.ok) throw new Error('Ошибка сохранения перегенерации');
      
      const newSlide = await res.json();
      setSlides(prev => prev.map((s, i) => i === slideIndex ? newSlide : s));
      setPromptInput(prev => ({ ...prev, [slideIndex]: '' }));
    } catch (err: any) {
      alert(err.message || 'Произошла ошибка');
    } finally {
      setRegeneratingSlide(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!generation) {
    return <div className="text-center text-zinc-500 py-12">Генерация не найдена</div>;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto"
    >
      <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Готовые слайды</h1>
          <p className="text-zinc-500">
            Маркетплейс: <span className="font-medium text-zinc-900">{generation.marketplace}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {isAdmin && generation.user_id !== 'system' && (
            <button 
              onClick={handleMakeExample}
              className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-medium py-2 px-4 rounded-xl transition-colors flex items-center gap-2 shrink-0"
            >
              <Star className="w-4 h-4" />
              В примеры
            </button>
          )}
          <button 
            onClick={handleDownloadAll}
            className="bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-900 font-medium py-2 px-4 rounded-xl transition-colors flex items-center gap-2 shrink-0"
          >
            <Download className="w-4 h-4" />
            Скачать все
          </button>
        </div>
      </div>

      {showKeyModal && (
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-bold text-amber-900 mb-1">Необходим API-ключ</h3>
            <p className="text-sm text-amber-800">
              Для перегенерации слайдов требуется выбрать API-ключ с платной подпиской (Gemini 3 Pro Image).
            </p>
          </div>
          <button 
            onClick={handleOpenKey}
            className="bg-amber-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-amber-700 transition-colors shrink-0"
          >
            Выбрать API-ключ
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6 mb-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              Описание (Промпт)
            </h3>
            <p className="text-zinc-600 text-sm leading-relaxed bg-zinc-50 p-4 rounded-xl border border-zinc-100">
              {generation.description}
            </p>
          </div>
          
          {generation.original_images && generation.original_images.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-zinc-900 mb-3 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                Исходные фотографии
              </h3>
              <div className="flex flex-wrap gap-3">
                {generation.original_images.map((img: string, i: number) => (
                  <a href={img} target="_blank" rel="noreferrer" key={i} className="block w-20 h-20 rounded-lg overflow-hidden border border-zinc-200 hover:border-indigo-500 transition-colors">
                    <img src={img} alt={`Original ${i + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <h2 className="text-xl font-bold mb-6">Сгенерированные слайды</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {slides.map((slide, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden flex flex-col">
            <div className={`relative group ${generation.marketplace === 'ozon' ? 'aspect-square' : 'aspect-[3/4]'}`}>
              <img src={slide.image_url} alt={`Slide ${i + 1}`} className="w-full h-full object-cover" />
              
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                <button 
                  onClick={() => handleDownload(slide.image_url, `slide-${i + 1}.jpg`)}
                  className="bg-white text-zinc-900 p-3 rounded-full hover:scale-110 transition-transform shadow-lg"
                  title="Скачать"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>

              {regeneratingSlide === i && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                  <Loader2 className="w-8 h-8 animate-spin text-white" />
                </div>
              )}
            </div>
            
            <div className="p-4 flex-1 flex flex-col">
              <h3 className="font-bold text-sm mb-2">
                {i === 0 ? '1. Главный слайд' : 
                 i === 1 ? '2. Описание' : 
                 i === 2 ? '3. Детали (текст)' : 
                 i === 3 ? '4. Инфографика' : 
                 '5. Коллаж (вживую)'}
              </h3>
              
              <div className="mt-auto pt-4 space-y-3">
                <input
                  type="text"
                  placeholder="Что изменить? (опционально)"
                  value={promptInput[i] || ''}
                  onChange={e => setPromptInput(prev => ({ ...prev, [i]: e.target.value }))}
                  className="w-full text-sm p-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
                <button
                  onClick={() => handleRegenerate(i)}
                  disabled={regeneratingSlide === i}
                  className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  Перегенерировать (50 ₽)
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
