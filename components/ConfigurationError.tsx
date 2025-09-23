import React, { useState } from 'react';
import { KeyIcon } from './icons/KeyIcon.tsx';
import { saveApiConfig, getApiConfig, ApiConfig } from '../services/apiKeyService.ts';

const InputField: React.FC<{
    label: string;
    name: keyof ApiConfig;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isSecret?: boolean;
}> = ({ label, name, value, onChange, isSecret = false }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            {label}
        </label>
        <input
            type={isSecret ? "password" : "text"}
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
        />
    </div>
);

const ConfigurationError: React.FC<{}> = () => {
    const [config, setConfig] = useState<ApiConfig>(getApiConfig());

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setConfig(prevConfig => ({
            ...prevConfig,
            [name]: value,
        }));
    };

    const handleSave = () => {
        saveApiConfig(config);
        // Add a small delay to ensure localStorage is updated before reload
        setTimeout(() => {
            window.location.reload();
        }, 100);
    };

    const firebaseFields: (keyof ApiConfig)[] = [
        'firebase_api_key', 'firebase_auth_domain', 'firebase_project_id',
        'firebase_storage_bucket', 'firebase_messaging_sender_id', 'firebase_app_id'
    ];

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex justify-center items-center p-4">
            <div className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 md:p-8">
                <div className="text-center mb-6">
                    <div className="inline-block p-3 bg-red-100 dark:bg-red-900/40 rounded-full mb-4">
                        <KeyIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Требуется настройка API</h1>
                    <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
                        Пожалуйста, введите ваши ключи API. Они будут сохранены локально в вашем браузере.
                    </p>
                </div>
                
                <div className="space-y-6">
                    <div className="p-4 border rounded-lg">
                        <h2 className="text-xl font-semibold mb-3">Firebase</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {firebaseFields.map(fieldName => (
                                <InputField
                                    key={fieldName}
                                    label={fieldName.replace('firebase_', '').replace('_', ' ').toUpperCase()}
                                    name={fieldName}
                                    value={config[fieldName]}
                                    onChange={handleChange}
                                    isSecret={fieldName === 'firebase_api_key'}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                        <h2 className="text-xl font-semibold mb-3">Google</h2>
                         <div className="space-y-4">
                             <InputField
                                label="Gemini API Key"
                                name="gemini_api_key"
                                value={config.gemini_api_key}
                                onChange={handleChange}
                                isSecret
                            />
                            <InputField
                                label="Google Client ID"
                                name="google_client_id"
                                value={config.google_client_id}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 text-center">
                    <button
                        onClick={handleSave}
                        className="w-full px-8 py-3 bg-primary-600 text-white font-semibold rounded-md hover:bg-primary-700 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-slate-800"
                    >
                        Сохранить конфигурацию и перезагрузить
                    </button>
                     <p className="text-xs text-slate-500 mt-4">
                        Ваши ключи хранятся только в `localStorage` вашего браузера и никуда не отправляются.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ConfigurationError;
