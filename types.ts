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
    resume: string; // The text content of the resume
    searchSettings: SearchSettings;
    // For Avito integration
    avitoClientId?: string;
    avitoClientSecret?: string;
}

export type KanbanStatus = 'new' | 'tracking' | 'interview' | 'offer' | 'archive';

export const kanbanStatusMap: Record<KanbanStatus, string> = {
    new: 'Новые',
    tracking: 'Отслеживаю',
    interview: 'Собеседование',
    offer: 'Оффер',
    archive: 'Архив',
};


export interface Interaction {
    id: string;
    type: 'note' | 'email_sent' | 'status_change' | 'call' | 'response_received' | 'auto_status_update';
    timestamp: string; // ISO string
    content: string;
}

export interface Job {
    id: string;
    userId: string;
    profileId: string;
    title: string;
    company: string;
    salary: string;
    location: string;
    description: string;
    url: string;
    sourcePlatform: string; // e.g., "hh.ru", "Habr Career", "Avito"
    
    // AI-generated fields
    matchAnalysis?: string;
    responsibilities: string[];
    requirements: string[];
    companyRating?: number;
    companyReviewSummary?: string;
    contacts?: {
        email?: string;
        phone?: string;
        telegram?: string;
    };
    
    // Application tracking fields
    kanbanStatus: KanbanStatus;
    notes?: string;
    history?: Interaction[];
    isActive?: boolean; // For checking if the job posting is still active
}

export interface Email {
    id: string;
    from: string;
    subject: string;
    snippet: string;
    body: string;
}

export interface GoogleUser {
    name: string;
    email: string;
    picture: string;
}
