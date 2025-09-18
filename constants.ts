import { v4 as uuidv4 } from 'uuid';
import type { SearchSettings, Prompts } from './types';

export enum AppStatus {
    Idle = 'Idle',
    Loading = 'Loading',
    Success = 'Success',
    Error = 'Error',
}

export const DEFAULT_RESUME = `[ВАШЕ ИМЯ]
[Контактная информация: телефон, email, ссылка на портфолио/LinkedIn]

ОПЫТ РАБОТЫ
[Название компании], [Город] — [Должность]
[ММ.ГГГГ] - [ММ.ГГГГ]
- [Ключевое достижение 1]
- [Ключевое достижение 2]

НАВЫКИ
- [Навык 1]
- [Навык 2]

ОБРАЗОВАНИЕ
[Название учебного заведения], [Город]
[Специальность], [Год окончания]`;

export const DEFAULT_SEARCH_SETTINGS: SearchSettings = {
    positions: 'Frontend-разработчик',
    salary: 150000,
    currency: 'RUB',
    location: 'Москва',
    remote: true,
    employment: ['full'],
    schedule: ['fullDay', 'remote'],
    skills: 'React, TypeScript, JavaScript',
    keywords: '',
    minCompanyRating: 3.5,
    platforms: [
        { id: uuidv4(), name: 'HeadHunter', url: 'https://hh.ru/search/vacancy', enabled: true, type: 'scrape' },
        { id: uuidv4(), name: 'Habr Career', url: 'https://career.habr.com/vacancies', enabled: true, type: 'scrape' },
        { id: uuidv4(), name: 'LinkedIn', url: 'https://www.linkedin.com/jobs/search/', enabled: false, type: 'scrape' },
        { id: uuidv4(), name: 'Avito', url: 'https://www.avito.ru/all/rabota', enabled: false, type: 'api' },
    ],
    limit: 10,
};

export const DEFAULT_PROMPTS: Prompts = {
    jobSearch: `Analyze the provided HTML content from the job search results page of {platformName}. 
Your task is to extract job listings based on the user's query for "{positions}" in "{location}". 
For each job found, extract the following details: title, company, companyRating (if available, otherwise 0), companyReviewSummary (if available), salary (as a string), location, a brief description, responsibilities (as an array of strings), requirements (as an array of strings), the direct URL to the job posting, and contact information (email, phone, telegram if available).
Return the result as a JSON array of objects. Ensure the JSON is well-formed and contains only the extracted data. Do not include any jobs that are clearly irrelevant.`,
    
    resumeAdapt: `You are an expert career coach. Your task is to adapt the user's base resume to perfectly match the requirements of a specific job application for the position of "{jobTitle}" at "{jobCompany}".
Analyze the provided base resume and the job description. Rewrite and tailor the resume to highlight the most relevant skills, experiences, and achievements. Focus on using keywords from the job description. The output should be a complete, ready-to-use resume in plain text format. Do not include any conversational text, just the resume content itself.`,

    coverLetter: `You are a professional copywriter specializing in job applications. Write a compelling and concise cover letter for the position of "{jobTitle}" at "{jobCompany}".
The output must be a well-formed JSON object with two keys: "subject" and "body".
The "subject" should be an engaging email subject line.
The "body" should be the email content. It should be persuasive, tailored to the job description, and highlight the candidate's key qualifications. Keep it professional and concise.`,

    hrResponseAnalysis: `Analyze the following email from an HR manager. Based on its content, determine the current status of the job application. 
Your response must be a single word from this list: 'interview', 'offer', 'archive' (if it's a rejection), or 'tracking' (if it's a neutral or scheduling follow-up). 
Do not provide any explanation, just the single status word.`,

    shortMessage: `You are a job applicant. Write a short, professional, and friendly introductory message to a recruiter via a messenger (like Telegram or WhatsApp) regarding the "{jobTitle}" position at "{jobCompany}".
The message should be brief, mention the candidate's name ({candidateName}), express interest in the role, and ask if it's a good time to connect.
The output should be the message text only.`,

    emailJobMatch: `Analyze the following email text and the provided list of jobs. Identify which job the email is referring to.
Return ONLY the 'id' of the matching job from the list. If you cannot confidently determine a match, return the string "UNKNOWN".
Do not provide any explanation or extra text.`,
};
