import { GoogleGenAI } from "@google/genai";
import type { Job, Profile, KanbanStatus } from '../types';

// The API key is retrieved from environment variables, which is a secure practice.
const GEMINI_API_KEY = (import.meta as any).env.VITE_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error("Gemini API key is not configured. Please set VITE_GEMINI_API_KEY in your environment variables.");
}

// FIX: Initialize GoogleGenAI with a named apiKey parameter as per the coding guidelines.
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// A utility to handle API calls with error management
async function safeApiCall<T>(apiCall: () => Promise<T>, errorMessage: string): Promise<T> {
    try {
        return await apiCall();
    } catch (error) {
        console.error(errorMessage, error);
        // Using a generic error message for the user.
        throw new Error('Произошла ошибка при обращении к AI. Пожалуйста, проверьте свою консоль для деталей.');
    }
}

/**
 * Parses raw job data (potentially HTML) and enriches it with AI.
 */
export const analyzeAndEnrichJob = async (rawJob: Partial<Job>, profile: Profile): Promise<Job> => {
    return safeApiCall(async () => {
        const prompt = `
            Based on the provided job posting and my resume, please perform a detailed analysis.

            MY RESUME:
            ---
            ${profile.resume}
            ---

            JOB POSTING:
            ---
            Title: ${rawJob.title}
            Company: ${rawJob.company}
            Location: ${rawJob.location}
            Salary: ${rawJob.salary || 'Not specified'}
            Description:
            ${rawJob.description}
            ---
            
            Please return a JSON object with the following structure. Do not include any text before or after the JSON object.
            
            SCHEMA:
            {
              "matchAnalysis": "A brief, 2-3 sentence analysis of how well my resume matches this job, highlighting key strengths and potential gaps.",
              "responsibilities": ["An array of key responsibilities extracted from the description."],
              "requirements": ["An array of key requirements extracted from the description."],
              "companyRating": "An estimated company rating from 1 to 5 based on public perception, if possible. Default to 0 if unknown.",
              "companyReviewSummary": "A very brief summary of public sentiment about the company (e.g., 'Good work-life balance', 'Fast-paced environment'). Default to an empty string if unknown.",
              "contacts": {
                "email": "The contact email address, if found in the description. Otherwise null.",
                "phone": "The contact phone number, if found. Otherwise null.",
                "telegram": "The contact Telegram handle (e.g., @username), if found. Otherwise null."
              }
            }
        `;
        // FIX: Use the 'gemini-2.5-flash' model as specified in the guidelines.
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });

        // FIX: Access the generated text directly via the `.text` property on the response object.
        const resultJson = JSON.parse(response.text);

        return {
            ...rawJob,
            ...resultJson,
        } as Job;
    }, "Error in analyzeAndEnrichJob");
};


/**
 * Adapts a resume for a specific job.
 */
export const adaptResumeForJob = async (job: Job, profile: Profile): Promise<string> => {
    return safeApiCall(async () => {
        const prompt = `
            Please adapt my resume to better match the following job description.
            Focus on highlighting the most relevant skills and experiences.
            Rewrite parts of my resume to use keywords from the job description naturally.
            Maintain a professional tone and the same overall structure of my original resume.
            The output should be the full text of the adapted resume in Markdown format.

            MY ORIGINAL RESUME:
            ---
            ${profile.resume}
            ---

            TARGET JOB DESCRIPTION:
            ---
            Title: ${job.title} at ${job.company}
            Description: ${job.description}
            Responsibilities: ${job.responsibilities.join(', ')}
            Requirements: ${job.requirements.join(', ')}
            ---
        `;
        // FIX: Use the 'gemini-2.5-flash' model as specified in the guidelines.
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        
        // FIX: Access the generated text directly via the `.text` property on the response object.
        return response.text;
    }, "Error in adaptResumeForJob");
};

/**
 * Generates a cover letter for a job application.
 */
export const generateCoverLetter = async (job: Job, profile: Profile): Promise<string> => {
    return safeApiCall(async () => {
        const prompt = `
            Write a professional and concise cover letter for me to apply for the position of ${job.title} at ${job.company}.
            Use my resume to highlight my most relevant qualifications.
            Address the requirements listed in the job description.
            The tone should be enthusiastic but professional.
            The output should be the full text of the cover letter in Markdown format.

            MY RESUME:
            ---
            ${profile.resume}
            ---

            TARGET JOB DESCRIPTION:
            ---
            Title: ${job.title}
            Company: ${job.company}
            Description: ${job.description}
            Requirements: ${job.requirements.join(', ')}
            ---
        `;
        // FIX: Use the 'gemini-2.5-flash' model as specified in the guidelines.
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        // FIX: Access the generated text directly via the `.text` property on the response object.
        return response.text;
    }, "Error in generateCoverLetter");
};

/**
 * Generates interview preparation questions and tips.
 */
export const prepareForInterview = async (job: Job, profile: Profile): Promise<string> => {
    return safeApiCall(async () => {
        const prompt = `
            I have an interview for the ${job.title} position at ${job.company}.
            Based on my resume and the job description, generate a list of likely interview questions.
            Include behavioral, technical, and situational questions.
            For each question, provide a brief tip on how I should answer it, leveraging my experience from my resume.
            Format the output in Markdown.

            MY RESUME:
            ---
            ${profile.resume}
            ---

            JOB DESCRIPTION:
            ---
            ${job.description}
            ---
        `;
        // FIX: Use the 'gemini-2.5-flash' model as specified in the guidelines.
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        
        // FIX: Access the generated text directly via the `.text` property on the response object.
        return response.text;
    }, "Error in prepareForInterview");
};


/**
 * Analyzes an email from an HR representative and suggests a new Kanban status.
 */
export const analyzeHrResponse = async (emailText: string, job: Job): Promise<{ newStatus: KanbanStatus, analysis: string }> => {
    return safeApiCall(async () => {
        const prompt = `
            Analyze the following email I received regarding my application for "${job.title}" at "${job.company}".
            Determine the sentiment and the next step.
            Based on the content, suggest a new status for my application.
            The possible statuses are: 'interview', 'offer', 'archive' (for rejection).
            If the email is a scheduling request, a test assignment, or a positive next step, suggest 'interview'.
            If it's a job offer, suggest 'offer'.
            If it's a rejection, suggest 'archive'.
            If the status is ambiguous, keep the current status of '${job.kanbanStatus}'.
            
            Return a JSON object with the following structure:
            {
              "newStatus": "interview" | "offer" | "archive" | "${job.kanbanStatus}",
              "analysis": "A brief summary of the email and justification for the new status."
            }

            EMAIL TEXT:
            ---
            ${emailText}
            ---
        `;
        // FIX: Use the 'gemini-2.5-flash' model as specified in the guidelines.
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });

        // FIX: Access the generated text directly via the `.text` property on the response object.
        return JSON.parse(response.text);
    }, "Error in analyzeHrResponse");
};


/**
 * Compares up to 3 jobs and provides a summary.
 */
export const compareJobs = async (jobs: Job[], profile: Profile): Promise<string> => {
    return safeApiCall(async () => {
        const jobSummaries = jobs.map((job, index) => `
            JOB ${index + 1}: ${job.title} at ${job.company}
            ---
            Salary: ${job.salary || 'Not specified'}
            Location: ${job.location}
            Key Requirements: ${job.requirements.slice(0, 5).join(', ')}
            My AI Match Analysis: ${job.matchAnalysis}
            ---
        `).join('\n\n');

        const prompt = `
            Please compare the following jobs based on my resume and provide a summary.
            Highlight the pros and cons of each, considering my profile.
            Conclude with a recommendation on which job seems like the best fit and why.
            Format the output in Markdown.

            MY RESUME SUMMARY:
            ---
            ${profile.resume.substring(0, 500)}... 
            ---

            JOBS TO COMPARE:
            ---
            ${jobSummaries}
            ---
        `;
        // FIX: Use the 'gemini-2.5-flash' model as specified in the guidelines.
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        // FIX: Access the generated text directly via the `.text` property on the response object.
        return response.text;
    }, "Error in compareJobs");
};

/**
 * Checks if a job URL is still active by analyzing the page content.
 */
export const checkJobIsActive = async (jobUrl: string): Promise<boolean> => {
    // This is a placeholder. In a real app, this would require a backend function
    // to fetch the URL and avoid CORS issues. We'll simulate a Gemini call.
    return safeApiCall(async () => {
        const prompt = `
            Imagine you are a web scraper. If you visit the URL "${jobUrl}", would you expect to see a message like "vacancy has been archived", "job not found", "вакансия в архиве", or "вакансия не найдена"?
            Answer with a single word: "active" or "inactive".
        `;
        // FIX: Use the 'gemini-2.5-flash' model as specified in the guidelines.
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        // Simple check on the response text.
        // FIX: Access the generated text directly via the `.text` property on the response object.
        return !response.text.toLowerCase().includes('inactive');
    }, "Error in checkJobIsActive");
};


/**
 * Analyzes a list of emails to find replies related to tracked jobs.
 */
export const findJobReplyInEmails = async (emails: { body: string, from: string, subject: string }[], jobs: Job[]): Promise<{ jobToUpdate: Job, analysis: string, newStatus: KanbanStatus } | null> => {
     return safeApiCall(async () => {
        const jobInfo = jobs.map(j => ({ id: j.id, title: j.title, company: j.company, status: j.kanbanStatus }));

        const prompt = `
            I have a list of my recent emails and a list of jobs I'm tracking.
            Please find the FIRST email that is a clear reply to one of my job applications.
            The reply could be a rejection, an interview invitation, or a test assignment.
            
            Return a JSON object with the ID of the job that the email corresponds to, and a suggested new status ('interview', 'offer', 'archive').
            If no emails are relevant replies, return null.

            The JSON schema should be:
            {
              "jobId": "the_id_of_the_matching_job",
              "newStatus": "interview" | "offer" | "archive",
              "analysis": "Brief summary of why this email matches this job and the reason for the status change."
            }

            LIST OF JOBS:
            ---
            ${JSON.stringify(jobInfo, null, 2)}
            ---

            LIST OF EMAILS:
            ---
            ${JSON.stringify(emails.map(e => ({ from: e.from, subject: e.subject, body: e.body.substring(0, 300) + '...' })), null, 2)}
            ---
        `;
        // FIX: Use the 'gemini-2.5-flash' model as specified in the guidelines.
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });
        
        try {
            // FIX: Access the generated text directly via the `.text` property on the response object.
            const result = JSON.parse(response.text);
            if (result && result.jobId) {
                const jobToUpdate = jobs.find(j => j.id === result.jobId);
                if (jobToUpdate) {
                    return {
                        jobToUpdate,
                        analysis: result.analysis,
                        newStatus: result.newStatus,
                    };
                }
            }
        } catch (e) {
            // FIX: Access the generated text directly via the `.text` property on the response object.
            console.error("Could not parse JSON from Gemini for email analysis:", response.text);
            return null;
        }

        return null;
    }, "Error in findJobReplyInEmails");
};
