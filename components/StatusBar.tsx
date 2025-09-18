
import React from 'react';
import { AppStatus } from '../constants';

interface StatusBarProps {
    status: AppStatus;
    message: string;
}

const StatusBar: React.FC<StatusBarProps> = ({ status, message }) => {
    const statusStyles = {
        [AppStatus.Idle]: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
        [AppStatus.Loading]: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
        [AppStatus.Success]: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300',
        [AppStatus.Error]: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300',
    };

    return (
        <div className={`w-full p-3 mb-6 rounded-lg text-sm text-center font-medium ${statusStyles[status]}`}>
            {message}
        </div>
    );
};

export default StatusBar;
