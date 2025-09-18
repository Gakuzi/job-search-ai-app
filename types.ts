import type { Timestamp } from "firebase/firestore";

export type KanbanStatus = 'new' | 'tracking' | 'interview' | 'offer' | 'archive';

export const kanbanStatusMap: Record<KanbanStatus, string> = {
    new: 'Новые',
    tracking: 'Отслеживаемые',
    interview: 'Собеседование',
    offer: 'Оффер',
    archive: 'Архив'
};

export interface Contacts {
    email?: string;
    phone?: string;
    telegram?: string;
}

export interface Job {
    id: string;
    userId: string;
    profileId: string;
    title: string;
    company: string;
    companyRating: number;
    companyReviewSummary: string;
    salary: string;
    location: string;
    description: string;
    responsibilities: string[];
    requirements: string[];
    url: string;
    matchAnalysis: string;
    contacts?: Contacts;
    kanbanStatus: KanbanStatus;
    sourcePlatform: string;
}

export interface Platform {
    id: string;
    name: string;
    url: string;
    enabled: boolean;
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
    limit: number;
    platforms: Platform[];
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
    userId: string;
    name:string;
    resume: string;
    settings: SearchSettings;
    createdAt: Timestamp;
}

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
