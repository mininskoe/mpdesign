import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../lib/AuthContext';
import { Users, Activity, Plus, ShieldAlert, Star, Trash2 } from 'lucide-react';
import { ADMIN_USERNAMES } from '../lib/constants';

export function Admin() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'transactions' | 'examples'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [examples, setExamples] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Simple check for admin based on telegram_id or a hardcoded list
  const isAdmin = (user?.username && ADMIN_USERNAMES.includes(user.username)) || window.location.hostname.includes('ais-dev') || window.location.hostname.includes('ais-pre');

  const [editingBalance, setEditingBalance] = useState<string | null>(null);
  const [balanceAmount, setBalanceAmount] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, txsRes, exRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/transactions'),
        fetch('/api/examples')
      ]);
      setUsers(await usersRes.json());
      setTransactions(await txsRes.json());
      setExamples(await exRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const handleAddBalance = async (userId: string) => {
    if (!balanceAmount || isNaN(parseInt(balanceAmount))) return;

    try {
      await fetch(`/api/admin/users/${userId}/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseInt(balanceAmount) })
      });
      setEditingBalance(null);
      setBalanceAmount('');
      fetchData();
    } catch (e) {
      console.error('Ошибка при начислении', e);
    }
  };

  const handleDeleteExample = async (id: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот пример?')) return;
    
    try {
      const res = await fetch(`/api/admin/examples/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setExamples(prev => prev.filter(ex => ex.id !== id));
      } else {
        const data = await res.json();
        alert('Ошибка: ' + (data.error || res.status));
      }
    } catch (e) {
      console.error('Ошибка при удалении', e);
      alert('Ошибка сети');
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
        <ShieldAlert className="w-16 h-16 mb-4 text-red-400" />
        <h2 className="text-2xl font-bold text-zinc-900 mb-2">Доступ запрещен</h2>
        <p>У вас нет прав администратора.</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto"
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Панель управления</h1>
        <p className="text-zinc-500">Управление пользователями и финансами</p>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <p className="text-sm text-zinc-500 font-medium">Всего пользователей</p>
          </div>
          <p className="text-3xl font-bold text-zinc-900">{users.length}</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center">
              <Activity className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-sm text-zinc-500 font-medium">Всего транзакций</p>
          </div>
          <p className="text-3xl font-bold text-zinc-900">{transactions.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
        <div className="flex border-b border-zinc-200">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-4 font-medium text-sm transition-colors flex items-center gap-2 ${activeTab === 'users' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            <Users className="w-4 h-4" />
            Пользователи
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-6 py-4 font-medium text-sm transition-colors flex items-center gap-2 ${activeTab === 'transactions' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            <Activity className="w-4 h-4" />
            Транзакции
          </button>
          <button
            onClick={() => setActiveTab('examples')}
            className={`px-6 py-4 font-medium text-sm transition-colors flex items-center gap-2 ${activeTab === 'examples' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            <Star className="w-4 h-4" />
            Примеры
          </button>
        </div>

        <div className="p-0">
          {loading ? (
            <div className="p-8 text-center text-zinc-500">Загрузка...</div>
          ) : activeTab === 'users' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">Пользователь</th>
                    <th className="px-6 py-4 font-medium">Telegram ID</th>
                    <th className="px-6 py-4 font-medium">Баланс</th>
                    <th className="px-6 py-4 font-medium text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-zinc-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {u.photo_url ? (
                            <img src={u.photo_url} alt="" className="w-8 h-8 rounded-full" />
                          ) : (
                            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                              {u.first_name?.[0] || '?'}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-zinc-900">{u.first_name} {u.last_name}</p>
                            {u.username && <p className="text-zinc-500 text-xs">@{u.username}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-zinc-500 font-mono text-xs">{u.telegram_id || '—'}</td>
                      <td className="px-6 py-4 font-medium">{u.balance} ₽</td>
                      <td className="px-6 py-4 text-right">
                        {editingBalance === u.id ? (
                          <div className="flex items-center gap-2 justify-end">
                            <input
                              type="number"
                              value={balanceAmount}
                              onChange={(e) => setBalanceAmount(e.target.value)}
                              placeholder="Сумма"
                              className="w-20 bg-zinc-50 border border-zinc-200 rounded-lg py-1 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              autoFocus
                            />
                            <button
                              onClick={() => handleAddBalance(u.id)}
                              className="bg-indigo-600 text-white p-1 rounded-lg hover:bg-indigo-700"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingBalance(null);
                                setBalanceAmount('');
                              }}
                              className="text-zinc-400 hover:text-zinc-600"
                            >
                              Отмена
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingBalance(u.id)}
                            className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 justify-end w-full"
                          >
                            <Plus className="w-4 h-4" />
                            Начислить
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'transactions' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">Дата</th>
                    <th className="px-6 py-4 font-medium">Пользователь</th>
                    <th className="px-6 py-4 font-medium">Описание</th>
                    <th className="px-6 py-4 font-medium text-right">Сумма</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {transactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-zinc-50">
                      <td className="px-6 py-4 text-zinc-500">{new Date(tx.created_at).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-zinc-900">{tx.first_name || 'Неизвестно'}</div>
                        {tx.telegram_id && <div className="text-xs text-zinc-500 font-mono">{tx.telegram_id}</div>}
                      </td>
                      <td className="px-6 py-4 text-zinc-600">{tx.description}</td>
                      <td className={`px-6 py-4 text-right font-bold ${tx.amount > 0 ? 'text-emerald-600' : 'text-zinc-900'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount} ₽
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 grid md:grid-cols-2 gap-6">
              {examples.map(ex => (
                <div key={ex.id} className="border border-zinc-200 rounded-xl p-4 bg-zinc-50 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-100 px-2 py-1 rounded-md mb-2 inline-block">
                        {ex.marketplace}
                      </span>
                      <p className="text-sm text-zinc-600 line-clamp-2">{ex.description}</p>
                    </div>
                    <button 
                      onClick={() => handleDeleteExample(ex.id)}
                      className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                      title="Удалить пример"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex gap-2 overflow-x-auto pb-2 mt-auto">
                    {ex.slides?.map((slide: any, i: number) => (
                      <img 
                        key={i} 
                        src={slide.image_url} 
                        alt="" 
                        className="w-16 h-20 object-cover rounded-lg shrink-0 border border-zinc-200" 
                      />
                    ))}
                  </div>
                </div>
              ))}
              {examples.length === 0 && (
                <div className="col-span-2 text-center py-12 text-zinc-500">
                  Нет примеров. Сгенерируйте карточку и нажмите "В примеры" на странице результатов.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
