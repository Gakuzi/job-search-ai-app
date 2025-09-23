import { GoogleGenAI } from "@google/genai";
import type { Job, Profile, PromptTemplate } from '../types';
import { getApiKey } from './apiKeyService';

const API_KEY = getApiKey('gemini_api_key');

// Initialize the GenAI client. It's okay if API_KEY is initially empty.
// The generate function will handle the case where the key is missing.
const ai = new GoogleGenAI({ apiKey: API_KEY });

const model = "gemini-1.5-flash";

const generate = async (prompt: string, isJson: boolean = false) => {
    if (!API_KEY) {
        const errorMessage = "Ключ Gemini API не настроен. Пожалуйста, добавьте его на экране конфигурации.";
        console.error(errorMessage);
        throw new Error(errorMessage);
    }
    try {
        const result = await ai.models.generateContent({
            model,
            contents: [{role: "user", parts: [{text: prompt}]}],
            generationConfig: {
                ...(isJson && { responseMimeType: "application/json" }),
                temperature: 0.5,
            },
        });
        return result.response.text();
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        // Provide a more user-friendly error message
        if (error.message.includes('API key not valid')) {
             throw new Error("Ключ Gemini API недействителен. Проверьте его на экране конфигурации.");
        }
        throw new Error("Не удалось получить ответ от сервиса ИИ.");
    }
};

export const analyzeJobWithResume = async (job: Omit<Job, 'id' | 'userId' | 'profileId' | 'kanbanStatus'>, resume: string): Promise<string> => {
    const prompt = `
        Проанализируй, насколько подходит кандидат с данным резюме для следующей вакансии.
        Дай краткий (2-3 предложения) и честный анализ сильных и слабых сторон кандидата относительно вакансии.
        
        Резюме кандидата:
        ---
        ${resume}
        ---
        
        Описание вакансии:
        ---
        Должность: ${job.title} в ${job.company}
        Описание: ${job.description}
        Требования: ${job.requirements.join(', ')}
        Обязанности: ${job.responsibilities.join(', ')}
        ---
    `;
    return await generate(prompt);
};


export const adaptResumeForJob = async (job: Job, resume: string): Promise<string> => {
    const prompt = `
        Адаптируй следующее резюме, чтобы оно максимально соответствовало требованиям вакансии.
        Сделай акцент на ключевых навыках и опыте, которые релевантны для этой должности.
        Не выдумывай опыт, которого нет в исходном резюме. Просто переформулируй и расставь акценты.
        Ответ должен быть только текстом адаптированного резюме, без лишних вступлений и заключений.

        Исходное резюме:
        ---
        ${resume}
        ---

        Вакансия:
        ---
        Должность: ${job.title} в ${job.company}
        Описание: ${job.description}
        Требования: ${job.requirements.join(', ')}
        Обязанности: ${job.responsibilities.join(', ')}
        ---
    `;
    return await generate(prompt);
};

export const generateCoverLetter = async (job: Job, resume: string): Promise<string> => {
    const prompt = `
        Напиши сопроводительное письмо для отклика на вакансию.
        Письмо должно быть профессиональным, вежливым и кратким (3-4 абзаца).
        Используй информацию из резюме кандидата, чтобы показать его релевантность.
        Обращайся к HR-менеджеру компании. Если имя неизвестно, используй "Уважаемый HR-менеджер".
        В конце вырази готовность пройти собеседование.
        Ответ должен быть только текстом письма.

        Резюме кандидата:
        ---
        ${resume}
        ---

        Вакансия:
        ---
        Должность: ${job.title}
        Компания: ${job.company}
        Описание: ${job.description}
        ---
    `;
    return await generate(prompt);
};

export const prepareForInterview = async (job: Job, resume: string): Promise<string> => {
    const prompt = `
        Подготовь кандидата к собеседованию на вакансию.
        
        1.  Сформулируй 5-7 наиболее вероятных технических вопросов по стеку вакансии.
        2.  Сформулируй 3-4 поведенческих вопроса (soft-skills).
        3.  Предложи 3-4 умных вопроса, которые кандидат может задать интервьюеру о компании, команде или проекте.
        4.  Дай краткие советы (2-3 пункта) о том, на что обратить внимание, основываясь на резюме и вакансии.

        Ответ верни в формате Markdown.

        Резюме кандидата:
        ---
        ${resume}
        ---

        Вакансия:
        ---
        Должность: ${job.title} в ${job.company}
        Описание: ${job.description}
        Требования: ${job.requirements.join(', ')}
        ---
    `;
    return await generate(prompt);
};

export const analyzeHrResponse = async (emailText: string, jobs: Job[]): Promise<{ jobId: string, newStatus: 'interview' | 'archive' }> => {
    const jobTitles = jobs.map(j => `ID: ${j.id}, Title: ${j.title}, Company: ${j.company}`).join('\n');
    const prompt = `
        Проанализируй текст письма от HR. Определи, к какой из вакансий оно относится, и какой новый статус следует присвоить этой вакансии.
        Возможные статусы: 'interview' (если приглашают на собеседование, созвон, тестовое задание) или 'archive' (если это отказ).
        
        Текст письма:
        ---
        ${emailText}
        ---
        
        Список активных вакансий:
        ---
        ${jobTitles}
        ---
        
        Ответ дай в формате JSON, где "jobId" - это ID наиболее подходящей вакансии, а "newStatus" - это новый статус ('interview' или 'archive').
        Например: {"jobId": "some-uuid-123", "newStatus": "interview"}
    `;
    
    const responseText = await generate(prompt, true);
    try {
        const parsed = JSON.parse(responseText.trim());
        if (parsed.jobId && (parsed.newStatus === 'interview' || parsed.newStatus === 'archive')) {
            return parsed;
        }
        throw new Error("Invalid JSON structure from AI.");
    } catch (e) {
        console.error("Failed to parse AI response for HR email analysis:", e);
        throw new Error("AI returned an invalid response format.");
    }
};

export const compareJobs = async (jobs: Job[], resume: string): Promise<string> => {
    const jobDescriptions = jobs.map(j => `
        ---
        ID: ${j.id}
        Должность: ${j.title}
        Компания: ${j.company}
        Зарплата: ${j.salary}
        Ключевые требования: ${j.requirements.slice(0, 5).join(', ')}
        ---
    `).join('\n');

    const prompt = `
        Сравни следующие вакансии с точки зрения кандидата с данным резюме.
        Для каждой вакансии оцени по 10-балльной шкале, насколько она подходит кандидату.
        Дай краткое (2-3 предложения) резюме по каждой вакансии, выделяя плюсы и минусы.
        В конце сделай общий вывод и порекомендуй, какая из вакансий является наиболее перспективной.
        Ответ верни в формате Markdown.

        Резюме кандидата:
        ---
        ${resume}
        ---

        Вакансии для сравнения:
        ${jobDescriptions}
    `;

    return await generate(prompt);
};

export const checkJobArchived = async (jobDescription: string): Promise<boolean> => {
    const prompt = `
        Проанализируй текст со страницы вакансии. Если в тексте есть явные указания, что вакансия "в архиве", "закрыта", "неактивна" или "больше не доступна", ответь "true". В противном случае ответь "false".
        Текст страницы:
        ---
        ${jobDescription}
        ---
    `;
    const response = await generate(prompt);
    return response.toLowerCase().includes('true');
};

export const generateQuickApplyMessage = async (job: Job, resume: string, profile: Profile, type: 'email' | 'whatsapp' | 'telegram'): Promise<{ subject?: string; body: string; }> => {
    const prompt = `
        Сгенерируй короткое, но профессиональное сообщение для быстрого отклика на вакансию через ${type}.
        Сообщение должно быть адаптировано под платформу (email более формальный, мессенджеры - менее).
        Обязательно упомяни должность.
        Используй информацию из резюме, чтобы кратко подчеркнуть релевантность кандидата.
        Если это email, сгенерируй также тему письма.
        Ответ дай в формате JSON. Для email: {"subject": "Тема письма", "body": "Текст письма"}. Для мессенджеров: {"body": "Текст сообщения"}.
        
        Резюме:
        ---
        ${resume}
        ---

        Вакансия:
        ---
        Должность: ${job.title} в ${job.company}
        ---

        Профиль кандидата:
        ---
        Имя: (предположим, имя есть в резюме)
        Желаемая должность: ${profile.searchSettings.positions}
        ---
    `;
    const responseText = await generate(prompt, true);
    try {
        return JSON.parse(responseText.trim());
    } catch(e) {
        console.error("Failed to parse AI response for quick apply:", e);
        throw new Error("AI returned an invalid response format.");
    }
};

export const executeCustomPrompt = async (template: string, job: Job, profile: Profile): Promise<string> => {
    // Replace placeholders in the template
    const filledPrompt = template
        .replace(/{{job.title}}/g, job.title)
        .replace(/{{job.company}}/g, job.company)
        .replace(/{{job.description}}/g, job.description)
        .replace(/{{profile.resume}}/g, profile.resume);
    
    return await generate(filledPrompt);
};
