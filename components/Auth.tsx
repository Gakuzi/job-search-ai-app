import React, { useState } from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { auth } from '../services/firebase';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword
} from 'firebase/auth';

const Auth: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth) {
            setError("Ошибка конфигурации. Не удалось подключиться к сервису аутентификации.");
            return;
        }
        setLoading(true);
        setError('');
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
            }
        } catch (err) {
            // FIX: The imported AuthError type seems to be incorrect or incompatible.
            // Using a structural type for the error object which is safer and resolves the issue.
            const authError = err as { code: string };
            switch (authError.code) {
                case 'auth/user-not-found':
                    setError('Пользователь с таким email не найден.');
                    break;
                case 'auth/wrong-password':
                    setError('Неверный пароль.');
                    break;
                case 'auth/email-already-in-use':
                    setError('Этот email уже используется.');
                    break;
                case 'auth/weak-password':
                    setError('Пароль слишком слабый. Он должен содержать не менее 6 символов.');
                    break;
                default:
                    setError('Произошла ошибка аутентификации.');
                    console.error(authError);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col justify-center items-center bg-slate-100 dark:bg-slate-900 p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-2">
                        <SparklesIcon className="w-10 h-10 text-primary-500" />
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
                            Поиск Работы <span className="text-primary-500">с ИИ</span>
                        </h1>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Войдите, чтобы получить доступ к вашему карьерному ассистенту.</p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-8">
                    <h2 className="text-2xl font-bold text-center text-slate-800 dark:text-slate-200 mb-6">
                        {isLogin ? 'Вход в аккаунт' : 'Создание аккаунта'}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="password"className="block text-sm font-medium text-slate-700 dark:text-slate-300">Пароль</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>

                        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-slate-400"
                            >
                                {loading ? 'Обработка...' : (isLogin ? 'Войти' : 'Зарегистрироваться')}
                            </button>
                        </div>
                    </form>
                    <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
                        {isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
                        <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="font-medium text-primary-600 hover:text-primary-500 ml-1">
                            {isLogin ? 'Зарегистрируйтесь' : 'Войдите'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Auth;