import { TelegramLogin } from './TelegramLogin';
import { useAuth } from '../lib/AuthContext';

export function LoginModal({ onClose }: { onClose: () => void }) {
  const { login } = useAuth();
  const botName = import.meta.env.VITE_TELEGRAM_BOT_NAME || 'MPdesignAI_bot';
  const isDev = window.location.hostname.includes('ais-dev');

  const handleAuth = async (data: any) => {
    try {
      await login(data);
      onClose();
    } catch (e) {
      console.error(e);
      alert('Ошибка авторизации. Убедитесь, что токен бота настроен верно.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full relative shadow-xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600">
          ✕
        </button>
        <h2 className="text-2xl font-bold text-center mb-2">Вход</h2>
        <p className="text-zinc-500 text-center mb-8 text-sm">
          Войдите через Telegram, чтобы сохранять историю генераций и пополнять баланс
        </p>
        
        {botName ? (
          <div className="flex flex-col gap-4">
            <TelegramLogin botName={botName} onAuth={handleAuth} />
            
            {isDev && (
              <button 
                onClick={() => handleAuth({
                  id: 123456789,
                  first_name: 'Тестовый',
                  last_name: 'Пользователь',
                  username: 'testuser',
                  auth_date: Math.floor(Date.now() / 1000),
                  hash: 'dev_mock_hash' // This will fail real validation, we need to bypass it in backend
                })}
                className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 font-medium py-2 rounded-xl text-sm transition-colors mt-4"
              >
                Тестовый вход (для разработки)
              </button>
            )}
          </div>
        ) : (
          <div className="text-center text-sm text-red-500 bg-red-50 p-4 rounded-xl">
            Бот не настроен. Укажите VITE_TELEGRAM_BOT_NAME в настройках окружения.
          </div>
        )}
      </div>
    </div>
  );
}
