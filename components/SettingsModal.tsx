import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import type { Profile, SearchSettings } from '../types';
import { useDebounce } from '../hooks/useDebounce';
import GmailConnect from './GmailConnect';
import type { GoogleUser } from '../types';
import { GlobeAltIcon } from './icons/GlobeAltIcon';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    profiles: Profile[];
    activeProfile: Profile | null;
    onUpdateProfile: (profileId: string, updates: Partial<Profile>) => void;
    onAddProfile: (newProfile: Omit<Profile, 'id' | 'userId'>) => void;
    onSwitchProfile: (profileId: string) => void;
    onDeleteProfile: (profileId: string) => void;
    // Gmail props
    isGoogleConnected: boolean;
    googleUser: GoogleUser | null;
    onGoogleConnect: () => void;
    onGoogleDisconnect: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
    isOpen,
    onClose,
    profiles,
    activeProfile,
    onUpdateProfile,
    onAddProfile,
    onSwitchProfile,
    onDeleteProfile,
    isGoogleConnected,
    googleUser,
    onGoogleConnect,
    onGoogleDisconnect,
}) => {
    const [currentProfile, setCurrentProfile] = useState<Profile | null>(activeProfile);
    const debouncedProfile = useDebounce(currentProfile, 1000);
    const [newProfileName, setNewProfileName] = useState('');

    useEffect(() => {
        setCurrentProfile(activeProfile);
    }, [activeProfile]);

    useEffect(() => {
        if (debouncedProfile && activeProfile && debouncedProfile.id === activeProfile.id) {
            // Create a diff to only update changed fields
            const updates: Partial<Profile> = {};
            (Object.keys(debouncedProfile) as Array<keyof Profile>).forEach(key => {
                if (JSON.stringify(debouncedProfile[key]) !== JSON.stringify(activeProfile[key])) {
                    (updates as any)[key] = debouncedProfile[key];
                }
            });
            if (Object.keys(updates).length > 0) {
                onUpdateProfile(debouncedProfile.id, updates);
            }
        }
    }, [debouncedProfile, activeProfile, onUpdateProfile]);

    const handleFieldChange = <K extends keyof Profile>(key: K, value: Profile[K]) => {
        if (currentProfile) {
            setCurrentProfile({ ...currentProfile, [key]: value });
        }
    };

    const handleSearchSettingsChange = <K extends keyof SearchSettings>(key: K, value: SearchSettings[K]) => {
        if (currentProfile) {
            setCurrentProfile({
                ...currentProfile,
                searchSettings: {
                    ...currentProfile.searchSettings,
                    [key]: value,
                },
            });
        }
    };
    
    const handleAddNewProfile = () => {
        if (newProfileName.trim()) {
            const newProfile: Omit<Profile, 'id' | 'userId'> = {
                name: newProfileName.trim(),
                resume: 'Вставьте сюда свое резюме...',
                searchSettings: {
                    platforms: { hh: true, habr: false, avito: false },
                    positions: 'Frontend Developer',
                    location: 'Москва',
                    salary: 150000,
                    limit: 20,
                    additional_requirements: ''
                }
            };
            onAddProfile(newProfile);
            setNewProfileName('');
        }
    }

    if (!isOpen || !currentProfile) return null;

    return (
        <Modal title="Настройки" onClose={onClose}>
            <div className="space-y-6">
                {/* Profile Management */}
                <div>
                    <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200">Профили поиска</h3>
                    <div className="flex items-center gap-2 mt-2">
                         <select
                            value={currentProfile.id}
                            onChange={(e) => onSwitchProfile(e.target.value)}
                            className="flex-grow p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md"
                        >
                            {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                         <button onClick={() => { if(window.confirm('Вы уверены? Это действие нельзя отменить.')) onDeleteProfile(currentProfile.id); }} className="px-3 py-2 text-sm text-red-600 bg-red-100 dark:bg-red-900/50 rounded-md hover:bg-red-200">Удалить</button>
                    </div>
                     <div className="flex items-center gap-2 mt-2">
                        <input type="text" value={newProfileName} onChange={e => setNewProfileName(e.target.value)} placeholder="Имя нового профиля" className="flex-grow p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md"/>
                        <button onClick={handleAddNewProfile} className="px-3 py-2 text-sm text-white bg-primary-600 rounded-md hover:bg-primary-700">Создать</button>
                    </div>
                </div>
                
                {/* Profile Details */}
                <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg space-y-4">
                    <h4 className="font-semibold">Настройки профиля "{currentProfile.name}"</h4>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Имя профиля</label>
                        <input
                            type="text"
                            value={currentProfile.name}
                            onChange={(e) => handleFieldChange('name', e.target.value)}
                            className="mt-1 w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Резюме</label>
                        <textarea
                            value={currentProfile.resume}
                            onChange={(e) => handleFieldChange('resume', e.target.value)}
                            rows={8}
                            className="mt-1 w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md"
                            placeholder="Вставьте сюда текст вашего резюме..."
                        />
                    </div>
                </div>

                {/* Search Settings */}
                <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg space-y-4">
                    <h4 className="font-semibold">Настройки поиска</h4>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Должность</label>
                        <input
                            type="text"
                            value={currentProfile.searchSettings.positions}
                            onChange={(e) => handleSearchSettingsChange('positions', e.target.value)}
                            className="mt-1 w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md"
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Локация</label>
                        <input
                            type="text"
                            value={currentProfile.searchSettings.location}
                            onChange={(e) => handleSearchSettingsChange('location', e.target.value)}
                            className="mt-1 w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md"
                        />
                    </div>
                </div>
                
                {/* Integrations */}
                <div className="space-y-4">
                     <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                        <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200 flex items-center gap-2"><GlobeAltIcon className="w-5 h-5"/> Интеграция с Avito</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 mb-3">
                           Добавьте ключи из <a href="https://www.avito.ru/business/tools/api" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline">кабинета разработчика Avito</a>, чтобы включить поиск по этой площадке.
                        </p>
                        <div className="space-y-2">
                             <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Client ID</label>
                                <input type="password" value={currentProfile.avitoClientId || ''} onChange={(e) => handleFieldChange('avitoClientId', e.target.value)} className="mt-1 w-full p-2 text-sm bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md"/>
                             </div>
                             <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Client Secret</label>
                                <input type="password" value={currentProfile.avitoClientSecret || ''} onChange={(e) => handleFieldChange('avitoClientSecret', e.target.value)} className="mt-1 w-full p-2 text-sm bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md"/>
                             </div>
                        </div>
                     </div>
                    <GmailConnect 
                        isConnected={isGoogleConnected}
                        user={googleUser}
                        onConnect={onGoogleConnect}
                        onDisconnect={onGoogleDisconnect}
                    />
                </div>
            </div>
        </Modal>
    );
};

export default SettingsModal;
