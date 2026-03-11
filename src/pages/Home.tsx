import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ShoppingBag, Box, Trash2 } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { ADMIN_USERNAMES } from '../lib/constants';

export function Home() {
  const navigate = useNavigate();
  const { user, requireLogin } = useAuth();
  const [examples, setExamples] = useState<any[]>([]);

  const isAdmin = (user?.username && ADMIN_USERNAMES.includes(user.username)) || window.location.hostname.includes('ais-dev') || window.location.hostname.includes('ais-pre');

  const fetchExamples = () => {
    fetch('/api/examples')
      .then(res => res.json())
      .then(data => {
        // Sort to match the original order
        const sorted = data.sort((a: any, b: any) => a.id.localeCompare(b.id));
        setExamples(sorted);
      });
  };

  useEffect(() => {
    fetchExamples();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // alert('Нажато удаление для ID: ' + id); // Отладочное сообщение
    
    try {
      const res = await fetch(`/api/admin/examples/${id}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        setExamples(prev => prev.filter(ex => ex.id !== id));
      } else {
        const data = await res.json();
        alert('Ошибка сервера: ' + (data.error || res.status));
      }
    } catch (error) {
      console.error('Error deleting example:', error);
      alert('Ошибка сети: ' + error);
    }
  };

  const handleSelect = (marketplace: 'ozon' | 'wildberries') => {
    if (!user) {
      requireLogin();
      return;
    }
    navigate('/upload', { state: { marketplace } });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto text-center py-12"
    >
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 mb-6">
        Генерация продающих карточек товаров
      </h1>
      <p className="text-lg text-zinc-600 mb-12 max-w-2xl mx-auto">
        Создавайте профессиональные слайды для маркетплейсов с помощью ИИ. 
        Выберите площадку для начала работы.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <button
          onClick={() => handleSelect('ozon')}
          className="group relative bg-white border-2 border-zinc-200 rounded-2xl p-8 hover:border-blue-500 hover:shadow-lg transition-all text-left flex flex-col items-center justify-center gap-4"
        >
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors">
            <Box className="w-8 h-8 text-blue-600" />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-zinc-900 mb-2">Ozon</h2>
            <p className="text-zinc-500 text-sm">Квадратные слайды (1:1)</p>
          </div>
        </button>

        <button
          onClick={() => handleSelect('wildberries')}
          className="group relative bg-white border-2 border-zinc-200 rounded-2xl p-8 hover:border-purple-500 hover:shadow-lg transition-all text-left flex flex-col items-center justify-center gap-4"
        >
          <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center group-hover:bg-purple-100 transition-colors">
            <ShoppingBag className="w-8 h-8 text-purple-600" />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-zinc-900 mb-2">Wildberries</h2>
            <p className="text-zinc-500 text-sm">Вертикальные слайды (3:4)</p>
          </div>
        </button>
      </div>

      <div className="mt-24 text-left">
        <h3 className="text-2xl font-bold mb-8 text-center">Примеры работ</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {examples.map((ex, i) => {
            const cat = ex.category || 'Товар';
            const img = ex.slides?.[0]?.image_url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop';
            
            return (
              <div key={i} className="relative group">
                <Link to={`/result/${ex.id}`} className="bg-white rounded-xl overflow-hidden border border-zinc-200 shadow-sm hover:border-indigo-500 hover:shadow-md transition-all block">
                  <div className="relative aspect-square overflow-hidden">
                    <img src={img} alt={cat} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <span className="bg-white text-zinc-900 text-xs font-bold px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">Смотреть</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h4 className="font-bold text-sm mb-1">{cat}</h4>
                    <p className="text-xs text-zinc-500 line-clamp-2" title={ex.description}>{ex.description}</p>
                  </div>
                </Link>
                
                {isAdmin && (
                  <button
                    onClick={(e) => handleDelete(e, ex.id)}
                    className="absolute top-2 right-2 p-3 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-xl z-50 cursor-pointer flex items-center justify-center"
                    title="Удалить из примеров"
                    type="button"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
