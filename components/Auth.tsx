import React, { useState } from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { auth } from '../services/firebase';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword
} from 'firebase/auth';
import { signInWithGoogle, getAccessTokenFromCredential } from '../services/googleAuthService';

const Auth: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError('');
        try {
            const credential = await signInWithGoogle();
            const token = getAccessTokenFromCredential(credential);
            if (token) {
                sessionStorage.setItem('googleAccessToken', token);
            }
            // Upon successful sign-in, the useAuthState hook in App.tsx will trigger a re-render
            // and this Auth component will be unmounted.
        } catch (err) {
            setError('Не удалось войти с помощью Google. Пожалуйста, попробуйте еще раз.');
            console.error(err);
            setLoading(false);
        }
        // No need to set loading to false on success, as the component will unmount.
    };

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

                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-300 dark:border-slate-600" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                    Или продолжите с
                                </span>
                            </div>
                        </div>

                        <div className="mt-6">
                            <button
                                onClick={handleGoogleSignIn}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                            >
                                <GoogleIcon className="w-5 h-5" />
                                <span>Войти через Google</span>
                            </button>
                        </div>
                    </div>

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