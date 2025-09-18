export interface Platform {
    id: string;
    name: string;
    url: string;
    enabled: boolean;
    type: 'scrape' | 'api';
}

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
    platforms: Platform[];
    limit: number;
}

export type KanbanStatus = 'new' | 'tracking' | 'interview' | 'offer' | 'archive';

export interface Interaction {
    id: string;
    type: 'email_sent' | 'email_received' | 'call' | 'note' | 'status_change';
    content: string;
    timestamp: string; // ISO 8601 format
}

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
    matchAnalysis?: string;
    url: string;
    sourcePlatform: string;
    contacts?: {
        email?: string;
        phone?: string;
        telegram?: string;
    };
    kanbanStatus: KanbanStatus;
    notes?: string;
    history?: Interaction[];
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
    hrResponseAnalysis: string;
    shortMessage: string;
    emailJobMatch: string;
}

export interface Profile {
    id: string;
    userId: string; // Link to the firebase user
    name: string;
    resume: string;
    settings: SearchSettings;
    prompts: Prompts;
    // Store API keys and integration settings in the user's profile in Firestore
    avitoClientId?: string;
    avitoClientSecret?: string;
    geminiApiKeys?: string[];
    activeGeminiApiKeyIndex?: number;
}

// --- Google & Gmail Types ---

export interface GoogleUser {
    name: string;
    email: string;
    picture: string;
}

export interface Email {
    id: string;
    from: string;
    subject: string;
    snippet: string;
    body: string;
}