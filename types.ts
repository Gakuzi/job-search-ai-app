export interface SearchSettings {
    positions: string;
    salary: number;
    currency: 'RUB' | 'USD' | 'EUR';
    location: string;
    remote: boolean;
    employment: string[];
    schedule: string[];
    skills: string;
    keywords: string;
    minCompanyRating: number;
    limit: number;
}

export type KanbanStatus = 'new' | 'tracking' | 'interview' | 'offer' | 'archive';

export interface Job {
    id: string;
    title: string;
    company: string;
    companyRating: number;
    companyReviewSummary: string;
    salary: string;
    location: string;
    description: string;
    responsibilities: string[];
    requirements: string[];
    matchAnalysis: string;
    url: string;
    contacts?: {
        email?: string;
        phone?: string;
        telegram?: string;
    };
    kanbanStatus: KanbanStatus;
    notes?: string;
    profileId: string; // To associate job with a profile
    userId: string; // To associate job with a user
}

export type ApplicationStatus = 'applied' | 'waiting' | 'interview' | 'offer' | 'rejected';


export const applicationStatusMap: Record<ApplicationStatus, string> = {
  applied: 'Отклик отправлен',
  waiting: 'Ожидание ответа',
  interview: 'Собеседование',
  offer: 'Предложение получено',
  rejected: 'Отказ',
};

export const kanbanStatusMap: Record<KanbanStatus, string> = {
    new: 'Новые Вакансии',
    tracking: 'Отслеживаю',
    interview: 'Собеседование',
    offer: 'Оффер',
    archive: 'Архив',
};


export const applicationStatusStyles: Record<ApplicationStatus, { border: string; text: string; pillBg: string; }> = {
    applied: { border: 'border-blue-500', text: 'text-blue-800 dark:text-blue-200', pillBg: 'bg-blue-100 dark:bg-blue-500/20' },
    waiting: { border: 'border-yellow-500', text: 'text-yellow-800 dark:text-yellow-200', pillBg: 'bg-yellow-100 dark:bg-yellow-500/20' },
    interview: { border: 'border-purple-500', text: 'text-purple-800 dark:text-purple-200', pillBg: 'bg-purple-100 dark:bg-purple-500/20' },
    offer: { border: 'border-green-500', text: 'text-green-800 dark:text-green-200', pillBg: 'bg-green-100 dark:bg-green-500/20' },
    rejected: { border: 'border-red-500', text: 'text-red-800 dark:text-red-200', pillBg: 'bg-red-100 dark:bg-red-500/20' },
};


export interface Application {
    id: string; // Corresponds to Job ID
    status: KanbanStatus;
    notes?: string;
}

export interface Prompts {
    jobSearch: string;
    resumeAdapt: string;
    coverLetter: string;
}

export interface Profile {
    id: string;
    userId: string; // Link to the firebase user
    name: string;
    resume: string;
    settings: SearchSettings;
    prompts: Prompts;
}