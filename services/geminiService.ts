import { GoogleGenAI, Type } from "@google/genai";
import type { Job, SearchSettings } from '../types';

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

export const searchJobs = async (promptTemplate: string, resume: string, settings: SearchSettings): Promise<Job[]> => {
    const ai = getAiClient();
    const prompt = promptTemplate
      .replace('{limit}', String(settings.limit))
      .replace('{location}', settings.location)
      .replace('{minCompanyRating}', String(settings.minCompanyRating));

    const fullPrompt = `${prompt}\n\n## Резюме кандидата:\n${resume}\n\n## Критерии поиска:\n${JSON.stringify(settings, null, 2)}`;
    
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

    // The response.text is already a clean JSON string due to responseSchema
    return JSON.parse(response.text) as Job[];
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

export const generateCoverLetter = async (promptTemplate: string, job: Job, candidateName: string): Promise<string> => {
    const ai = getAiClient();
    const prompt = promptTemplate
      .replace('{jobTitle}', job.title)
      .replace('{jobCompany}', job.company);

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `${prompt}\n\n## Описание вакансии:\n${job.description}`
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

export const analyzeResumeAndAskQuestions = async (resumeText: string): Promise<string> => {
    const ai = getAiClient();
    const prompt = `
Действуй как дружелюбный AI-ассистент по карьере. Твоя задача - проанализировать текст резюме и определить, достаточно ли в нем информации для качественного поиска работы.
Ключевая информация, которая тебе нужна:
1.  **Желаемые должности** (например, "руководитель проекта", "CEO").
2.  **Желаемая минимальная зарплата** (в рублях или другой валюте).
3.  **Предпочитаемая локация** (город или "удаленно").

Проанализируй текст ниже.
-   Если ВСЯ ключевая информация присутствует, ответь ОДНИМ СЛОВОМ: **READY**.
-   Если чего-то не хватает, задай ОДИН вежливый и короткий уточняющий вопрос, чтобы получить недостающую информацию. Спрашивай только о том, чего действительно нет. Например: "Спасибо! Резюме выглядит отлично. Уточните, пожалуйста, на какую минимальную зарплату вы рассчитываете?" или "Спасибо за резюме! Какие должности и в каком городе вы рассматриваете в первую очередь?".

Текст резюме для анализа:
---
${resumeText}
---
`;
    const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
    return response.text;
};

export const generateProfileFromChat = async (chatHistory: string): Promise<{ resume: string, settings: SearchSettings }> => {
    const ai = getAiClient();
    const prompt = `
Основываясь на всей истории диалога с пользователем (включая изначальный текст резюме и последующие ответы), создай его полный карьерный профиль.
Результат должен быть строго в формате JSON-объекта с двумя ключами: "resume" и "settings".

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
    
    const parsedResult = parseJsonResponse<{ resume: string, settings: SearchSettings }>(response.text, 'создания профиля');

    if (!parsedResult || !parsedResult.resume || !parsedResult.settings || !parsedResult.settings.positions) {
        console.error("Incomplete profile data from AI:", parsedResult);
        throw new Error('ИИ вернул неполные данные для создания профиля. Убедитесь, что в диалоге была предоставлена вся информация (должность, зарплата, локация).');
    }

    return {
        resume: parsedResult.resume,
        settings: parsedResult.settings,
    };
};