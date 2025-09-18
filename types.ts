export type KanbanStatus = 'new' | 'tracking' | 'interview' | 'offer' | 'archive';

export const kanbanStatusMap: Record<KanbanStatus, string> = {
    new: 'Новые',
    tracking: 'Отслеживаются',
    interview: 'Собеседование',
    offer: 'Оффер',
    archive: 'Архив'
};

export interface Interaction {
    id: string;
    type: 'note' | 'email_sent' | 'status_change' | 'call' | 'reply_received';
    content: string;
    timestamp: string; // ISO 8601 format
}

export interface JobContacts {
    email?: string;
    phone?: string;
    telegram?: string;
}

export interface Job {
    id: string;
    userId: string;
    profileId: string;
    kanbanStatus: KanbanStatus;
    title: string;
    company: string;
    location: string;
    salary: string;
    url: string;
    description: string;
    responsibilities: string[];
    requirements: string[];
    matchAnalysis?: string;
    sourcePlatform: string;
    companyRating?: number;
    companyReviewSummary?: string;
    notes?: string;
    history?: Interaction[];
    contacts?: JobContacts;
    createdAt?: any; // for firestore serverTimestamp
    isArchived?: boolean; // To check if vacancy is closed
}

export interface SearchSettings {
    platforms: {
        hh: boolean;
        habr: boolean;
        avito: boolean;
    };
    positions: string;
    location: string;
    salary: number;
    limit: number;
    additional_requirements: string;
}

export interface Profile {
    id: string;
    userId: string;
    name: string;
    resume: string;
    searchSettings: SearchSettings;
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

export interface PromptTemplate {
    id: string;
    name: string;
    description: string;
    template: string;
}
