// FIX: Remove reference types that cause errors when @types are not installed.
// The global declaration below is sufficient for type checking.

// FIX: Add global declaration for gapi to resolve type errors when @types are not available.
declare const gapi: any;

// FIX: Corrected import path for types
import type { Email } from "../types";

interface SendEmailParams {
    to: string;
    from: string;
    fromName: string;
    subject: string;
    body: string;
}

const getHeader = (headers: any[], name: string) => {
    const header = headers.find(h => h.name === name);
    return header ? header.value || '' : '';
};

const getBody = (message: any): string => {
    let encodedBody = '';
    if (typeof message.payload?.parts === 'undefined') {
        encodedBody = message.payload?.body?.data || '';
    } else {
        const part = message.payload.parts.find((p:any) => p.mimeType === 'text/plain') || message.payload.parts[0];
        encodedBody = part?.body?.data || '';
    }
    
    if (encodedBody) {
        try {
            // Replace URL-safe base64 characters
            const base64 = encodedBody.replace(/-/g, '+').replace(/_/g, '/');
            // Decode base64 and then URI component
            return decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        } catch (e) {
            console.error('Error decoding message body:', e);
            return '(Не удалось декодировать содержимое письма)';
        }
    }
    return '';
};

export const sendEmail = async (params: SendEmailParams): Promise<void> => {
    const { to, from, fromName, subject, body } = params;

    // RFC 2822 formatted email
    const emailLines = [
        `From: "${fromName}" <${from}>`,
        `To: ${to}`,
        `Content-type: text/html;charset=utf-8`,
        `Subject: ${subject}`,
        '',
        body.replace(/\n/g, '<br>')
    ];
    const email = emailLines.join('\r\n');

    // Base64 encode the email
    const base64EncodedEmail = btoa(unescape(encodeURIComponent(email)));

    await gapi.client.gmail.users.messages.send({
        userId: 'me',
        resource: {
            raw: base64EncodedEmail
        }
    });
};

export const listMessages = async (maxResults = 20): Promise<Email[]> => {
    try {
        const listResponse = await gapi.client.gmail.users.messages.list({
            userId: 'me',
            maxResults,
            labelIds: ['INBOX'],
        });

        const messages = listResponse.result.messages || [];
        if (messages.length === 0) {
            return [];
        }

        const batch = gapi.client.newBatch();
        messages.forEach(message => {
            if (message.id) {
                batch.add(gapi.client.gmail.users.messages.get({ userId: 'me', id: message.id }));
            }
        });

        const batchResponse = await batch;
        const results = batchResponse.result;
        if (!results) {
            return [];
        }
        
        return Object.values(results)
            .map((responseWrapper: any) => {
                if (!responseWrapper || responseWrapper.status >= 400 || !responseWrapper.result || responseWrapper.result.error) {
                    console.error('Ошибка в одном из ответов пакета Gmail:', responseWrapper.result?.error);
                    return null;
                }
                const msg = responseWrapper.result as any;
                const headers = msg.payload?.headers || [];
                return {
                    id: msg.id || '',
                    from: getHeader(headers, 'From'),
                    subject: getHeader(headers, 'Subject'),
                    snippet: msg.snippet || '',
                    body: getBody(msg),
                };
            })
            .filter((email): email is Email => email !== null);
    } catch (error: any) {
        console.error("Ошибка Gmail API в listMessages:", error);
        const errorMessage = error.result?.error?.message || error.message || "Не удалось получить доступ к Gmail API.";
        if (errorMessage.includes("API not enabled") || errorMessage.includes("accessNotConfigured")) {
            throw new Error("API Gmail не включено в вашем проекте Google Cloud. Перейдите в Google Cloud Console, найдите 'Gmail API' и нажмите 'Enable'.");
        }
        throw new Error(`Ошибка при чтении писем: ${errorMessage}`);
    }
};