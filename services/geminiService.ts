


import { GoogleGenAI, Type } from "@google/genai";
import type { Job, SearchSettings, KanbanStatus, Platform } from '../types';
import { getActiveApiKey, rotateApiKey } from './apiKeyService';

// --- API Key Management and Error Handling ---

const handleApiError = (error: unknown) => {
    const errorString = (error as any)?.message?.toLowerCase() || (error as Error).toString().toLowerCase();
        
    if (errorString.includes('429') || errorString.includes('quota')) {
        console.warn('API key quota exceeded. Rotating key.');
        rotateApiKey();
        throw new Error("Лимит запросов для текущего API ключа исчерпан. Мы автоматически переключились на следующий ключ. Пожалуйста, повторите ваше действие.");
    }
    
    if (errorString.includes('api key not valid')) {
        console.error('Invalid API key detected. Rotating key.');
        rotateApiKey();
        throw new Error("Текущий API ключ недействителен. Мы автоматически переключились на следующий. Проверьте ключи в настройках.");
    }
    
    if (errorString.includes('failed to fetch')) {
        console.warn('A "Failed to fetch" error occurred. This could be a transient network issue or a problem with the current API key. Rotating key as a precaution.');
        rotateApiKey();
        throw new Error("Произошла сетевая ошибка при обращении к Gemini API. Это может быть временно. Мы переключились на следующий API ключ; попробуйте еще раз.");
    }
    
    console.error('Gemini API Error:', error);
    throw error; // Re-throw other unhandled errors
};

const runAiOperation = async <T>(operation: (ai: GoogleGenAI) => Promise<T>): Promise<T> => {
    const apiKey = getActiveApiKey();
    if (!apiKey) {
        throw new Error("Ключ Gemini API не настроен. Добавьте его в Настройки -> API Ключи.");
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        return await operation(ai);
    } catch (error) {
        handleApiError(error);
        // This line will not be reached because handleApiError throws, but it's needed for type safety.
        throw error;
    }
};

async function* runStreamingAiOperation(operation: (ai: GoogleGenAI) => Promise<AsyncGenerator<string>>): AsyncGenerator<string> {
    const apiKey = getActiveApiKey();
    if (!apiKey) {
        throw new Error("Ключ Gemini API не настроен. Добавьте его в Настройки -> API Ключи.");
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        const stream = await operation(ai);
        for await (const chunk of stream) {
            yield chunk;
        }
    } catch (error) {
        handleApiError(error);
    }
}


/**
 * Helper to handle potential JSON parsing errors from the AI response.
 */
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


// --- Core AI Services ---

export const findJobsOnRealWebsite = async (promptTemplate: string, resume: string, settings: SearchSettings, platform: Platform): Promise<Omit<Job, 'id' | 'kanbanStatus' | 'profileId' | 'userId'>[]> => {
    const query = encodeURIComponent(`${settings.positions} ${settings.location}`);
    const searchUrl = `${platform.url}?text=${query}&clusters=true&enable_snippets=true&ored_clusters=true&area=113`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(searchUrl)}`;

    let htmlContent: string;
    try {
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`Ошибка сети при запросе к прокси для ${platform.name}: ${response.statusText}`);
        const data = await response.json();
        htmlContent = data.contents;
        if (!htmlContent) throw new Error(`Не удалось получить HTML-контент со страницы поиска ${platform.name}.`);
    } catch (error) {
        console.error(`Error fetching job page HTML from ${platform.name}:`, error);
        throw new Error(`Не удалось загрузить страницу с вакансиями с ${platform.name}. ${error instanceof Error ? error.message : ''}`);
    }

    const prompt = promptTemplate.replace('{limit}', String(settings.limit));
    const fullPrompt = `${prompt}\n\n## Резюме кандидата для анализа:\n${resume}\n\n## HTML-КОД ДЛЯ ПАРСИНГА:\n${htmlContent}`;

    const responseText = await runAiOperation(async (ai) => {
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
        return response.text;
    });

    const parsedJobs = JSON.parse(responseText) as Omit<Job, 'id' | 'kanbanStatus' | 'profileId' | 'userId' | 'sourcePlatform'>[];
    return parsedJobs.map(job => ({ ...job, sourcePlatform: platform.name }));
};

export async function* adaptResume(promptTemplate: string, resume: string, job: Job): AsyncGenerator<string> {
    const prompt = promptTemplate
      .replace('{jobTitle}', job.title)
      .replace('{jobCompany}', job.company);
    
    const fullPrompt = `${prompt}\n\n## Базовое резюме:\n${resume}\n\n## Описание вакансии:\n${job.description}\n\nОбязанности:\n${job.responsibilities.join('\n- ')}`;
    
    // FIX: The function passed to runStreamingAiOperation must be an async function that returns a promise resolving to an async generator.
    // The original `async function*` was incorrect as it directly returned an async generator.
    yield* runStreamingAiOperation(async (ai) => {
        const response = await ai.models.generateContentStream({
            model: "gemini-2.5-flash",
            contents: fullPrompt
        });
        async function* chunks() {
            for await (const chunk of response) {
                yield chunk.text;
            }
        }
        return chunks();
    });
}

export const generateCoverLetter = async (promptTemplate: string, job: Job, candidateName: string): Promise<{ subject: string; body: string }> => {
    return runAiOperation(async (ai) => {
        const prompt = promptTemplate
            .replace('{jobTitle}', job.title)
            .replace('{jobCompany}', job.company);

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `${prompt}\n\n## Описание вакансии:\n${job.description}`,
            config: { responseMimeType: "application/json" }
        });
        return parseJsonResponse<{ subject: string; body: string }>(response.text, 'сопроводительного письма');
    });
};

export const generateShortMessage = async (promptTemplate: string, job: Job, candidateName: string): Promise<string> => {
    return runAiOperation(async (ai) => {
        const prompt = promptTemplate
            .replace('{jobTitle}', job.title)
            .replace('{jobCompany}', job.company)
            .replace('{candidateName}', candidateName);

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt
        });
        return response.text;
    });
};

export async function* getInterviewQuestions(job: Job, resume: string): AsyncGenerator<string> {
    const prompt = `
Действуй как опытный HR-менеджер и карьерный коуч.
Подготовь кандидата к собеседованию на должность "${job.title}" в компанию "${job.company}".
На основе резюме кандидата и описания вакансии, сгенерируй список из 5-7 наиболее вероятных и важных вопросов.
Для каждого вопроса предоставь краткий совет по наилучшему ответу, учитывая сильные стороны кандидата из его резюме.
Также добавь 2-3 "умных" вопроса, которые кандидат может задать работодателю.
Результат верни в виде четко структурированного текста в формате Markdown.

## Резюме кандидата:
${resume}

## Описание вакансии:
**Описание:** ${job.description}
**Обязанности:** ${job.responsibilities.join(', ')}
    `;
    // FIX: The function passed to runStreamingAiOperation must be an async function that returns a promise resolving to an async generator.
    // The original `async function*` was incorrect as it directly returned an async generator.
    yield* runStreamingAiOperation(async (ai) => {
        const response = await ai.models.generateContentStream({
            model: "gemini-2.5-flash",
            contents: prompt
        });
        async function* chunks() {
            for await (const chunk of response) {
                yield chunk.text;
            }
        }
        return chunks();
    });
}

export const analyzeResumeAndAskQuestions = async (resumeText: string): Promise<string> => {
    return runAiOperation(async (ai) => {
        const prompt = `
Действуй как дружелюбный AI-ассистент по карьере. Твоя задача - проанализировать текст резюме и определить, достаточно ли в нем информации для качественного поиска работы.
Ключевая информация, которая тебе нужна:
1.  **Желаемые должности** (например, "руководитель проекта", "CEO").
2.  **Желаемая минимальная зарплата** (в рублях или другой валюте).
3.  **Предпочитаемая локация** (город или "удаленно").

Проанализируй текст ниже.
-   Если ВСЯ ключевая информация присутствует, ответь ОДНИМ СЛОВОМ: **READY**.
-   Если чего-то не хватает, задай ОДИН вежливый и короткий уточняющий вопрос, чтобы получить недостающую информацию. Спрашивай только о том, чего действительно нет.

Текст резюме для анализа:
---
${resumeText}
---
`;
        const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
        return response.text;
    });
};

export const generateProfileFromChat = async (chatHistory: string): Promise<{ resume: string, settings: SearchSettings, profileName: string }> => {
    const resultText = await runAiOperation(async (ai) => {
        const prompt = `
Основываясь на всей истории диалога с пользователем (включая изначальный текст резюме и последующие ответы), создай его полный карьерный профиль.
Результат должен быть строго в формате JSON-объекта с тремя ключами: "resume", "settings" и "profileName".

1.  **resume**: Создай отполированное и хорошо структурированное резюме в формате Markdown на основе всей предоставленной информации.
2.  **settings**: Создай объект с настройками поиска. Он должен включать поля:
    *   \`positions\` (string): Желаемые должности через запятую.
    *   \`salary\` (number): Минимальная желаемая зарплата.
    *   \`currency\` (string): 'RUB', 'USD', или 'EUR', определи из контекста. По умолчанию 'RUB'.
    *   \`location\` (string): Город или "Удаленно".
    *   \`remote\` (boolean): true, если пользователь ищет удаленную работу.
    *   \`employment\` (array of strings): ["полная занятость", "проектная работа"].
    *   \`schedule\` (array of strings): ["полный день", "гибкий график"].
    *   \`skills\` (string): Ключевые навыки и технологии из резюме через запятую.
    *   \`keywords\` (string): Пустая строка.
    *   \`minCompanyRating\` (number): 3.5.
    *   \`limit\` (number): 7.
3.  **profileName**: Создай короткое название для профиля в формате "[Имя Фамилия] - [Основная должность] - [Зарплата] [Валюта]". Например: "Иван Иванов - Product Manager - 150000 RUB". Извлеки эти данные из резюме и созданных настроек.

История диалога:
---
${chatHistory}
---

Верни только JSON-объект и ничего больше.
`;
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return response.text;
    });
    
    const parsedResult = parseJsonResponse<{ resume: string, settings: SearchSettings, profileName: string }>(resultText, 'создания профиля');

    if (!parsedResult || !parsedResult.resume || !parsedResult.settings || !parsedResult.settings.positions || !parsedResult.profileName) {
        console.error("Incomplete profile data from AI:", parsedResult);
        throw new Error('ИИ вернул неполные данные для создания профиля. Убедитесь, что в диалоге была предоставлена вся информация (должность, зарплата, локация).');
    }

    return parsedResult;
};

export const analyzeHrResponse = async (promptTemplate: string, emailText: string): Promise<KanbanStatus> => {
    const result = await runAiOperation(async (ai) => {
        const prompt = `${promptTemplate}\n${emailText}`;
        const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
        return response.text.trim().toLowerCase();
    });
    
    if (['new', 'tracking', 'interview', 'offer', 'archive'].includes(result)) {
        return result as KanbanStatus;
    }
    
    console.warn(`AI returned an unexpected status: '${result}'. Defaulting to 'tracking'.`);
    return 'tracking';
};

export const matchEmailToJob = async (emailText: string, jobs: Job[]): Promise<string> => {
    const result = await runAiOperation(async (ai) => {
        const simplifiedJobs = jobs.map(({ id, title, company }) => ({ id, title, company }));
        const prompt = `
# ЗАДАЧА: СОПОСТАВЛЕНИЕ EMAIL С ВАКАНСИЕЙ
Проанализируй текст письма и сравни его с предоставленным списком вакансий.
Верни ТОЛЬКО ID наиболее подходящей вакансии. Если не уверен, верни "UNKNOWN".

## Текст письма:
${emailText}

## Список вакансий:
${JSON.stringify(simplifiedJobs, null, 2)}
`;
        const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
        return response.text.trim();
    });

    const isValidId = jobs.some(job => job.id === result);
    if (isValidId) {
        return result;
    }

    console.warn(`AI returned an unknown job ID: '${result}'.`);
    return "UNKNOWN";
};


// --- Utility Functions ---

/**
 * A lightweight function to test if an API key is valid.
 * @param apiKey The API key to test.
 * @returns True if the key is valid, false otherwise.
 */
export const testApiKey = async (apiKey: string): Promise<boolean> => {
    if (!apiKey.trim()) return false;
    try {
        const ai = new GoogleGenAI({ apiKey });
        // Use a very simple and cheap prompt to test connectivity and auth.
        await ai.models.generateContent({ model: "gemini-2.5-flash", contents: "test" });
        return true;
    } catch (error) {
        console.error(`API key test failed:`, error);
        return false;
    }
};