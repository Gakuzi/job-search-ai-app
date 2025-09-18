export type KanbanStatus = 'new' | 'tracking' | 'interview' | 'offer' | 'archive';

export const kanbanStatusMap: Record<KanbanStatus, string> = {
    new: 'Новые',
    tracking: 'В работе',
    interview: 'Собеседование',
    offer: 'Оффер',
    archive: 'Архив',
};

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

export interface Prompts {
    jobSearch: string;
    resumeAdapt: string;
    coverLetter: string;
    hrResponseAnalysis: string;
    shortMessage: string;
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
    matchAnalysis: string;
    url: string;
    contacts?: {
        email?: string;
        phone?: string;
        telegram?: string;
    };
    kanbanStatus: KanbanStatus;
    notes?: string;
    profileId: string;
    userId: string;
}

export interface Profile {
    id: string;
    userId: string;
    name: string;
    resume: string;
    settings: SearchSettings;
    prompts: Prompts;
}
