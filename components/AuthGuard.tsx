import React from 'react';
import { User } from 'firebase/auth';
import Auth from './Auth';

interface AuthGuardProps {
    user: User | null;
    loading: boolean;
    children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ user, loading, children }) => {
    if (loading) {
         return (
            <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex justify-center items-center">
                <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    if (!user) {
        return <Auth />;
    }

    return <>{children}</>;
};

export default AuthGuard;
