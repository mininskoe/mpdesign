import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../lib/AuthContext';
import { Wallet, History, ArrowUpRight, ArrowDownRight, CreditCard } from 'lucide-react';

export function Cabinet() {
  const { user, topup } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'history' | 'transactions'>('history');
  const [isToppingUp, setIsToppingUp] = useState(false);
  const [customAmount, setCustomAmount] = useState<string>('');

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetch(`/api/users/${user.id}/transactions`)
      .then(res => res.json())
      .then(setTransactions);
      
    fetch(`/api/users/${user.id}/history`)
      .then(res => res.json())
      .then(setHistory);
  }, [user, navigate]);

  const handleTopup = async (amount: number, description: string) => {
    setIsToppingUp(true);
    // Simulate YooKassa payment flow
    setTimeout(async () => {
      await topup(amount, description);
      setIsToppingUp(false);
      
      if (user) {
        fetch(`/api/users/${user.id}/transactions`)
          .then(res => res.json())
          .then(setTransactions);
      }
    }, 1500);
  };

  if (!user) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Личный кабинет</h1>
          <p className="text-zinc-500">Управление балансом и история генераций</p>
        </div>
        <div className="bg-white px-6 py-4 rounded-2xl shadow-sm border border-zinc-200 flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center">
            <Wallet className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm text-zinc-500 font-medium">Ваш баланс</p>
            <p className="text-2xl font-bold text-zinc-900">{user?.balance || 0} ₽</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 text-center flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-lg mb-1">Базовое</h3>
            <p className="text-2xl font-bold text-indigo-600 mb-6">500 ₽</p>
          </div>
          <button
            onClick={() => handleTopup(500, 'Пополнение: 500 ₽')}
            disabled={isToppingUp}
            className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <CreditCard className="w-4 h-4" />
            Оплатить
          </button>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 text-center flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-lg mb-1">Оптимальное</h3>
            <p className="text-2xl font-bold text-indigo-600 mb-6">1000 ₽</p>
          </div>
          <button
            onClick={() => handleTopup(1000, 'Пополнение: 1000 ₽')}
            disabled={isToppingUp}
            className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <CreditCard className="w-4 h-4" />
            Оплатить
          </button>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 text-center flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-lg mb-1">Своя сумма</h3>
            <div className="mb-6 relative">
              <input
                type="number"
                min="100"
                step="100"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Например: 1500"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-4 text-center text-lg font-bold text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 font-medium">₽</span>
            </div>
          </div>
          <button
            onClick={() => {
              const amount = parseInt(customAmount);
              if (amount > 0) {
                handleTopup(amount, `Пополнение: ${amount} ₽`);
              }
            }}
            disabled={isToppingUp || !customAmount || parseInt(customAmount) <= 0}
            className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <CreditCard className="w-4 h-4" />
            Оплатить
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
        <div className="flex border-b border-zinc-200">
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-4 font-medium text-sm transition-colors flex items-center gap-2 ${activeTab === 'history' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            <History className="w-4 h-4" />
            История генераций
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-6 py-4 font-medium text-sm transition-colors flex items-center gap-2 ${activeTab === 'transactions' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            <Wallet className="w-4 h-4" />
            История транзакций
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'history' ? (
            <div className="space-y-4">
              {history.length === 0 ? (
                <p className="text-zinc-500 text-center py-8">История генераций пуста</p>
              ) : (
                history.map((gen, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border border-zinc-100 rounded-xl hover:bg-zinc-50 transition-colors">
                    <div>
                      <p className="font-medium text-zinc-900 mb-1">Генерация для {gen.marketplace}</p>
                      <p className="text-sm text-zinc-500 line-clamp-1 max-w-md">{gen.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-zinc-500 mb-1">{new Date(gen.created_at).toLocaleDateString()}</p>
                      <Link to={`/result/${gen.id}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                        Посмотреть результат
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.length === 0 ? (
                <p className="text-zinc-500 text-center py-8">История транзакций пуста</p>
              ) : (
                transactions.map((tx, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border border-zinc-100 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.amount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {tx.amount > 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-medium text-zinc-900">{tx.description}</p>
                        <p className="text-sm text-zinc-500">{new Date(tx.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <p className={`font-bold ${tx.amount > 0 ? 'text-emerald-600' : 'text-zinc-900'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount} ₽
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
