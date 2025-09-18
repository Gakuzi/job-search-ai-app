import type { Prompts, SearchSettings } from './types';

// FIX: This file contained raw text instead of TypeScript code. It has been rewritten to be a valid module that exports the required constants for the application.
export enum AppStatus {
    Idle = 'idle',
    Loading = 'loading',
    Success = 'success',
    Error = 'error',
}

export const DEFAULT_RESUME = `
# Имя Фамилия
Frontend-разработчик

## Контакты
- Email: your.email@example.com
- Telegram: @your_telegram
- GitHub: github.com/your_github

## Опыт работы
**Frontend Developer** | Awesome Company | 2021 - н.в.
- Разработка и поддержка пользовательских интерфейсов с использованием React, Redux и TypeScript.
- Участие в проектировании архитектуры фронтенд-приложений.

## Навыки
- **Языки:** JavaScript, TypeScript, HTML5, CSS3
- **Фреймворки:** React, Next.js
- **Инструменты:** Webpack, Git, Jest, Docker
`.trim();

export const DEFAULT_SEARCH_SETTINGS: SearchSettings = {
    positions: 'Frontend-разработчик',
    salary: 150000,
    currency: 'RUB',
    location: 'Москва',
    remote: true,
    employment: ['full'],
    schedule: ['fullDay'],
    skills: 'React, TypeScript, Redux',
    keywords: '',
    minCompanyRating: 0,
    limit: 10,
    platforms: [
        { id: 'default-1', name: 'HeadHunter', url: 'https://hh.ru/search/vacancy', enabled: true, type: 'scrape' },
        { id: 'default-2', name: 'Habr Career', url: 'https://career.habr.com/vacancies', enabled: true, type: 'scrape' },
        { id: 'default-4', name: 'Avito', url: 'https://api.avito.ru', enabled: true, type: 'api' },
        { id: 'default-3', name: 'LinkedIn', url: 'https://www.linkedin.com/jobs/search/', enabled: false, type: 'scrape' },
    ],
};

export const DEFAULT_PROMPTS: Prompts = {
    jobSearch: `
# ЗАДАЧА: ПОИСК И ИЗВЛЕЧЕНИЕ ВАКАНСИЙ С САЙТА
Ты — AI-ассистент, твоя задача — выступить в роли умного парсера для сайта по поиску работы. Ты должен проанализировать параметры поиска, предоставленные пользователем, и затем извлечь релевантную информацию из HTML-кода страницы с результатами поиска.

# ШАГ 1: АНАЛИЗ ПАРАМЕТРОВ (для твоего понимания)
Вот параметры, которые пользователь хочет использовать для поиска на сайте '{platformName}':
- Должности: '{positions}'
- Локация: '{location}'
- Лимит вакансий: {limit}

# ШАГ 2: ИЗВЛЕЧЕНИЕ ДАННЫХ ИЗ HTML
Ниже предоставлен HTML-код страницы, полученный по этим параметрам. Твоя задача — извлечь из него структурированную информацию о вакансиях.

# ИНСТРУКЦИИ:
1.  **Найди карточки вакансий:** Внимательно изучи HTML-структуру. Каждая вакансия обычно находится внутри div-контейнера с классом вроде 'vacancy-card--z_UXteNo7bRGzxreB0_I' или 'vacancy-item--main'.
2.  **Извлеки данные для каждой вакансии:**
    *   **title:** Название вакансии.
    *   **company:** Название компании.
    *   **salary:** Зарплата. Если не указана, верни "не указана".
    *   **location:** Город или регион.
    *   **description:** Краткое описание или требования.
    *   **url:** Полная, абсолютная ссылка на вакансию.
    *   **contacts:** Постарайся найти контактные данные (email, phone, telegram). Если нет, не включай это поле.
    *   **companyRating:** Оставь 0.
    *   **companyReviewSummary:** Оставь пустой строкой.
    *   **responsibilities:** Оставь пустым массивом [].
    *   **requirements:** Оставь пустым массивом [].
3.  **Сформируй JSON:** Верни результат в виде JSON-массива объектов. Каждый объект должен соответствовать структуре вакансии. Не включай вакансии без названия или ссылки. Ограничь результат {limit} вакансиями.
    
# ВАЖНО:
-   **Точность:** Извлекай текст как есть.
-   **Формат:** Вывод должен быть СТРОГО JSON-массивом, без комментариев или \`\`\`json ... \`\`\` оберток.
-   **Ошибки:** Если HTML не содержит вакансий, верни пустой массив \`[]\`.

# HTML-КОД ДЛЯ ПАРСИНГА:
`.trim(),
    resumeAdapt: `
# ЗАДАЧА: АДАПТАЦИЯ РЕЗЮМЕ ПОД ВАКАНСИЮ
Ты — карьерный консультант. Твоя задача — помочь соискателю адаптировать его базовое резюме под конкретную вакансию.
Сделай акцент на тех навыках и опыте, которые наиболее релевантны для позиции '{jobTitle}' в компании '{jobCompany}'.
Сохрани структуру и формат Markdown. Будь кратким и по делу.
`.trim(),
    coverLetter: `
# ЗАДАЧА: СОСТАВЛЕНИЕ СОПРОВОДИТЕЛЬНОГО ПИСЬМА
Ты — AI-копирайтер. Напиши сопроводительное письмо для отклика на вакансию '{jobTitle}' в компанию '{jobCompany}'.
Письмо должно быть вежливым, профессиональным и кратким (3-4 абзаца).
Выдели ключевые навыки кандидата, которые соответствуют требованиям вакансии.
Верни результат в формате JSON с двумя ключами: "subject" (тема письма) и "body" (тело письма).
`.trim(),
    hrResponseAnalysis: `
# ЗАДАЧА: АНАЛИЗ ОТВЕТА ОТ HR
Проанализируй текст письма от HR. Определи его суть и верни ОДНО из следующих ключевых слов, которое лучше всего описывает статус:
- 'interview': Если в письме есть приглашение на собеседование (любой этап).
- 'offer': Если это предложение о работе.
- 'archive': Если это отказ.
- 'tracking': Если это нейтральный ответ, подтверждение получения резюме или просьба подождать.
Верни только одно слово и ничего больше.

## Текст письма для анализа:
`.trim(),
    shortMessage: `
# ЗАДАЧА: КОРОТКОЕ СООБЩЕНИЕ ДЛЯ МЕССЕНДЖЕРА
Напиши короткое, вежливое и профессиональное сообщение для отправки в мессенджер (WhatsApp/Telegram) по поводу вакансии '{jobTitle}' в компании '{jobCompany}'.
Представься от имени {candidateName}. Уточни, актуальна ли еще вакансия и куда можно направить резюме.
`.trim(),
    emailJobMatch: `
# ЗАДАЧА: СОПОСТАВЛЕНИЕ EMAIL С ВАКАНСИЕЙ
Проанализируй текст письма и сравни его с предоставленным списком вакансий.
Верни ТОЛЬКО ID наиболее подходящей вакансии. Если не уверен, верни "UNKNOWN".
`.trim(),
};