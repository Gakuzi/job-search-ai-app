import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

import type { Job, Profile, SearchSettings, HrAnalysisResult } from './types';

const API_KEY = (import.meta as any).env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  safetySettings: [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  ],
});

async function runPrompt(prompt: string): Promise<string> {
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error running Gemini prompt:', error);
    throw new Error('Произошла ошибка при обращении к AI. Проверьте консоль для деталей.');
  }
}

async function runJSONPrompt<T>(prompt: string): Promise<T> {
    const resultText = await runPrompt(prompt + '\n\nОтвет должен быть только в формате JSON, без какого-либо другого текста или markdown-разметки.');
    try {
        // Sometimes the model still wraps the JSON in ```json ... ```
        const cleanJson = resultText.replace(/^```json\n|```$/g, '').trim();
        return JSON.parse(cleanJson) as T;
    } catch (e) {
        console.error('Failed to parse JSON response from AI:', resultText);
        throw new Error('AI вернул некорректный JSON. Пожалуйста, попробуйте еще раз.');
    }
}

export async function analyzeResumeWithAI(resume: string): Promise<{ positions: string; location: string; }> {
    const prompt = `
    Проанализируй следующий текст резюме и извлеки из него ключевую информацию.
    Меня интересуют только две вещи:
    1.  **Должность (positions):** На какую должность или должности претендует кандидат? Укажи через запятую, если их несколько. Например: "Frontend Developer, React Developer".
    2.  **Локация (location):** В каком городе или городах кандидат ищет работу? Если не указано, предположи, исходя из текста, или оставь поле пустым.

    Резюме:
    ---
    ${resume}
    ---

    Ответ дай в формате JSON, вот так: { "positions": "...", "location": "..." }
    `;
    return runJSONPrompt<{ positions: string; location: string; }>(prompt);
}


export async function analyzeJobWithResume(job: Omit<Job, 'id'>, resume: string): Promise<string> {
  const prompt = `
    Оцени, насколько вакансия подходит кандидату по 10-балльной шкале. 
    Кратко (2-3 предложения) объясни свою оценку, сделав акцент на ключевых совпадениях или несовпадениях.
    
    Резюме кандидата:
    ---
    ${resume}
    ---
    Вакансия: 
    Должность: ${job.title}
    Компания: ${job.company}
    Описание: ${job.description}
    ---

    Пример ответа: "7/10. Отлично подходит по стеку (React, TypeScript), но опыт кандидата (2 года) меньше требуемого (3+)."
  `;
  return runPrompt(prompt);
}

// FIX: Implementing the missing function for the Prompt Editor.
export async function executeCustomPrompt(template: string, job: Job, profile: Profile): Promise<string> {
    // This function replaces placeholders like {{job.title}} with actual data.
    const compiledPrompt = template
        .replace(/\{\{\s*job\.title\s*\}\}/g, job.title)
        .replace(/\{\{\s*job\.company\s*\}\}/g, job.company || '')
        .replace(/\{\{\s*job\.description\s*\}\}/g, job.description)
        .replace(/\{\{\s*profile\.resume\s*\}\}/g, profile.resume);
    
    return runPrompt(compiledPrompt);
}


export async function adaptResumeForJob(job: Job, resume: string): Promise<string> {
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
    ---
  `;
  return runPrompt(prompt);
}

export async function generateCoverLetter(job: Job, resume: string): Promise<string> {
    const prompt = `
    Напиши сопроводительное письмо для отклика на вакансию. 
    Письмо должно быть профессиональным, вежливым и кратким (3-4 абзаца). 
    Используй информацию из резюме кандидата, чтобы показать его релевантность. 
    Обращайся к HR-менеджеру компании. Если имя неизвестно, используй 'Уважаемый HR-менеджер'. 
    В конце вырази готовность пройти собеседование. Ответ должен быть только текстом письма.

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
  return runPrompt(prompt);
}

export async function prepareForInterview(job: Job, resume: string): Promise<string> {
    const prompt = `
    Подготовь меня к собеседованию на вакансию. 
    На основе моего резюме и описания вакансии, составь список из 5-7 наиболее вероятных технических и поведенческих вопросов, которые мне могут задать. 
    Также предложи 2-3 умных вопроса, которые я могу задать интервьюеру о команде, проекте или компании.

    Мое резюме:
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
  return runPrompt(prompt);
}

export async function analyzeHrResponse(emailText: string, jobs: Job[]): Promise<HrAnalysisResult> {
    const jobList = jobs.map(j => `ID: ${j.id}, Должность: ${j.title}, Компания: ${j.company}`).join('\n');
    const prompt = `
    Проанализируй текст письма от HR и определи, к какой из моих вакансий оно относится. 
    Также определи новый статус для этой вакансии.
    Возможные статусы: "Собеседование", "Техническое задание", "Отказ".
    
    Текст письма:
    ---
    ${emailText}
    ---
    
    Мой список активных вакансий:
    ---
    ${jobList}
    ---
    
    Ответ дай в формате JSON, вот так: { "jobId": "...", "newStatus": "..." }
    Если не удалось однозначно определить вакансию, в поле jobId верни "not_found".
    `;
    return runJSONPrompt<HrAnalysisResult>(prompt);
}

export async function compareJobs(jobs: Job[], resume: string): Promise<string> {
    const jobList = jobs.map((j, i) => `
        ВАКАНСИЯ ${i+1}:
        ID: ${j.id}
        Должность: ${j.title}
        Компания: ${j.company}
        Описание: ${j.description}
    `).join('\n---\n');

    const prompt = `
    Сравни несколько вакансий и порекомендуй лучшую для меня. 
    Проанализируй их сильные и слабые стороны относительно моего резюме.
    
    Мое резюме:
    ---
    ${resume}
    ---
    
    Вакансии для сравнения:
    ---
    ${jobList}
    ---

    В ответе сначала кратко подытожь плюсы и минусы каждой вакансии, а затем сделай четкую рекомендацию, какая из них является лучшим выбором и почему.
    `;
    return runPrompt(prompt);
}
