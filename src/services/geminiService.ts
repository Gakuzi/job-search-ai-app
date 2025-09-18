
import { GoogleGenAI, Type } from "@google/genai";
import type { Job, SearchSettings, KanbanStatus, Platform } from '../types';
// FIX: Import DEFAULT_PROMPTS to make it available in this module.
import { DEFAULT_PROMPTS } from "../constants";

const getAiClient = () => {
    // Vite использует `import.meta.env` для доступа к переменным окружения
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
        console.error("Gemini API key is not configured. Please set the VITE_GEMINI_API_KEY environment variable.");
        throw new Error("Ключ Gemini API не настроен. Укажите его в переменных окружения на Vercel.");
    }
    return new GoogleGenAI({ apiKey });
};


// Helper to handle potential JSON parsing errors
const parseJsonResponse = <T>(text: string, context: string): T => {
    try {
        const cleanedText = text.replace(/^```json\s*|```\s*$/g, '').trim();
        return JSON.parse(cleanedText) as T;
    } catch (error) {
        console.error(`Failed to parse JSON for ${context}:`, error);
        console.error("Original text:", text);
        throw new Error(`Не удалось обработать ответ от ИИ в формате JSON для: ${context}. Проверьте консоль для деталей.`);
    }
};

export const analyzeResumeAndAskQuestions = async (text: string): Promise<string> => {
    const ai = getAiClient();
    const prompt = `
# ЗАДАЧА: АНАЛИЗ РЕЗЮМЕ И УТОЧНЯЮЩИЕ ВОПРОСЫ
Ты — AI-ассистент для настройки профиля поиска работы. Тебе предоставили текст от пользователя.
Твоя задача — проанализировать его и решить, достаточно ли информации для создания профиля.

# ИНСТРУКЦИИ:
1.  **Проверь наличие ключевой информации:**
    *   Имя и Фамилия.
    *   Контактная информация (хотя бы email или телефон).
    *   Опыт работы или образование.
    *   Желаемая должность.
    *   Желаемая зарплата.
    *   Город для поиска.
2.  **Прими решение:**
    *   **ЕСЛИ** вся ключевая информация присутствует, верни **ТОЛЬКО** слово \`READY\`.
    *   **ЕСЛИ** какой-то информации не хватает, сформулируй 1-2 вежливых, коротких вопроса, чтобы уточнить недостающие данные. Например: "Спасибо! Отличное резюме. Подскажите, пожалуйста, на какую зарплату вы рассчитываете и в каком городе ищете работу?".
3.  **ВАЖНО:** Не задавай больше 2-х вопросов за раз. Не придумывай информацию. Ответ должен быть либо \`READY\`, либо уточняющие вопросы.

# ТЕКСТ ОТ ПОЛЬЗОВАТЕЛЯ:
${text}
`;
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
    });
    return response.text;
};


export const generateProfileFromChat = async (chatHistory: string): Promise<{ resume: string, settings: SearchSettings, profileName: string }> => {
    const ai = getAiClient();
    const prompt = `
# ЗАДАЧА: АНАЛИЗ ДИАЛОГА И СОЗДАНИЕ ПРОФИЛЯ
Ты — AI HR-ассистент. Проанализируй весь диалог с кандидатом и создай на его основе полный профиль для поиска работы.

# ИНСТРУКЦИИ:
1.  **Синтезируй Резюме:** Собери всю информацию (опыт, навыки, образование) в единый, хорошо структурированный текст резюме в формате Markdown.
2.  **Извлеки Параметры Поиска (SearchSettings):**
    *   **positions:** Ключевые должности (e.g., "Frontend Developer, React Engineer").
    *   **salary:** Желаемая зарплата (число).
    *   **currency:** Валюта ('RUB', 'USD', 'EUR').
    *   **location:** Город для поиска.
3.  **Извлеки Имя и Фамилию:** Найди в тексте имя и фамилию кандидата.
4.  **Сгенерируй Название Профиля:** Создай название по формату: "[Имя Фамилия] - [Первая должность], от [Зарплата] [Валюта]".
5.  **Верни JSON:** Сформируй и верни СТРОГО один JSON-объект, без markdown-оберток.

# ДИАЛОГ ДЛЯ АНАЛИЗА:
${chatHistory}
`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { 
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    resume: { type: Type.STRING },
                    settings: {
                        type: Type.OBJECT,
                        properties: {
                            positions: { type: Type.STRING },
                            salary: { type: Type.NUMBER },
                            currency: { type: Type.STRING },
                            location: { type: Type.STRING },
                        },
                        required: ["positions", "salary", "currency", "location"],
                    },
                    profileName: { type: Type.STRING }
                },
                required: ["resume", "settings", "profileName"]
            }
        }
    });

    return parseJsonResponse<{ resume: string, settings: SearchSettings, profileName: string }>(response.text, 'создания профиля');
};

export const findJobsOnRealWebsite = async (promptTemplate: string, resume: string, settings: SearchSettings, platform: Platform): Promise<Omit<Job, 'id' | 'kanbanStatus' | 'profileId' | 'userId'>[]> => {
    const ai = getAiClient();
    
    const query = encodeURIComponent(`${settings.positions} ${settings.location}`);
    // Use the platform's specific URL
    const searchUrl = `${platform.url}?text=${query}&clusters=true&enable_snippets=true&ored_clusters=true&area=113`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(searchUrl)}`;

    let htmlContent: string;
    try {
        const response = await fetch(proxyUrl);
        if (!response.ok) {
            throw new Error(`Ошибка сети при запросе к прокси для ${platform.name}: ${response.statusText}`);
        }
        const data = await response.json();
        htmlContent = data.contents;
        if (!htmlContent) {
            throw new Error(`Не удалось получить HTML-контент со страницы поиска ${platform.name}.`);
        }
    } catch (error) {
        console.error(`Error fetching job page HTML from ${platform.name}:`, error);
        throw new Error(`Не удалось загрузить страницу с вакансиями с ${platform.name}. ${error.message}`);
    }

    const prompt = promptTemplate.replace('{limit}', String(settings.limit));
    const fullPrompt = `${prompt}\n\n## Резюме кандидата для анализа:\n${resume}\n\n## HTML-КОД ДЛЯ ПАРСИНГА:\n${htmlContent}`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: fullPrompt,
        config: {
            responseMimeType: "application/json",
             responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        company: { type: Type.STRING },
                        companyRating: { type: Type.NUMBER },
                        companyReviewSummary: { type: Type.STRING },
                        salary: { type: Type.STRING },
                        location: { type: Type.STRING },
                        description: { type: Type.STRING },
                        responsibilities: { type: Type.ARRAY, items: { type: Type.STRING } },
                        requirements: { type: Type.ARRAY, items: { type: Type.STRING } },
                        matchAnalysis: { type: Type.STRING },
                        url: { type: Type.STRING },
                        contacts: {
                            type: Type.OBJECT,
                            properties: {
                                email: { type: Type.STRING },
                                phone: { type: Type.STRING },
                                telegram: { type: Type.STRING },
                            },
                             nullable: true,
                        },
                    },
                    required: ["title", "company", "salary", "location", "description", "matchAnalysis", "url"]
                }
            }
        }
    });

    const parsedJobs = JSON.parse(response.text) as Omit<Job, 'id' | 'kanbanStatus' | 'profileId' | 'userId' | 'sourcePlatform'>[];

    return parsedJobs.map(job => ({ ...job, sourcePlatform: platform.name }));
};

export const adaptResume = async (promptTemplate: string, resume: string, job: Job): Promise<string> => {
    const ai = getAiClient();
    const prompt = promptTemplate
      .replace('{jobTitle}', job.title)
      .replace('{jobCompany}', job.company);
      
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `${prompt}\n\n## Базовое резюме:\n${resume}\n\n## Описание вакансии:\n${job.description}\n\nОбязанности:\n${job.responsibilities.join('\n- ')}`
    });
    return response.text;
};

export const generateCoverLetter = async (promptTemplate: string, job: Job, candidateName: string): Promise<{ subject: string; body: string }> => {
    const ai = getAiClient();
    const prompt = promptTemplate
      .replace('{jobTitle}', job.title)
      .replace('{jobCompany}', job.company);

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `${prompt}\n\n## Описание вакансии:\n${job.description}`,
        config: { responseMimeType: "application/json" }
    });
    return parseJsonResponse<{ subject: string; body: string }>(response.text, 'сопроводительного письма');
};

export const generateShortMessage = async (promptTemplate: string, job: Job, candidateName: string): Promise<string> => {
    const ai = getAiClient();
    const prompt = promptTemplate
      .replace('{jobTitle}', job.title)
      .replace('{jobCompany}', job.company)
      .replace('{candidateName}', candidateName);

    const response = await ai.models.generateContent({
        // FIX: Corrected typo in the model name.
        model: "gemini-2.5-flash",
        contents: prompt
    });
    return response.text;
};

export const getInterviewQuestions = async (job: Job, resume: string): Promise<string> => {
    const ai = getAiClient();
    const prompt = `
Действуй как опытный HR-менеджер и карьерный коуч.
Подготовь кандидата к собеседованию на должность "${job.title}" в компанию "${job.company}".

На основе резюме кандидата и описания вакансии, сгенерируй список из 5-7 наиболее вероятных и важных вопросов, которые могут задать на собеседовании.
Для каждого вопроса предоставь краткий совет по наилучшему ответу, учитывая сильные стороны кандидата из его резюме.
Также добавь 2-3 "умных" вопроса, которые кандидат может задать работодателю, чтобы показать свою заинтересованность.

Результат верни в виде четко структурированного текста в формате Markdown.

## Резюме кандидата:
${resume}

## Описание вакансии:
**Описание:** ${job.description}
**Обязанности:** ${job.responsibilities.join(', ')}
    `;
    const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
    return response.text;
};

export const matchEmailToJob = async (emailText: string, jobs: Job[]): Promise<string> => {
    const ai = getAiClient();
    const prompt = `${DEFAULT_PROMPTS.emailJobMatch}\n\n## Текст письма:\n${emailText}\n\n## Список вакансий:\n${JSON.stringify(jobs.map(j => ({id: j.id, title: j.title, company: j.company})))}`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
    });

    return response.text.trim();
};

export const analyzeHrResponse = async (promptTemplate: string, emailText: string): Promise<KanbanStatus> => {
    const ai = getAiClient();
    const prompt = `${promptTemplate}\n\n${emailText}`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
    });
    
    const result = response.text.trim().toLowerCase();
    
    if (['interview', 'offer', 'archive', 'tracking'].includes(result)) {
        return result as KanbanStatus;
    }
    
    return 'tracking'; // Default fallback
};
