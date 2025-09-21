import type { Email } from "../types";

const GMAIL_API_BASE_URL = 'https://www.googleapis.com/gmail/v1/users/me';

interface SendEmailParams {
    to: string;
    from: string;
    fromName: string;
    subject: string;
    body: string;
}

const getHeader = (headers: any[], name: string) => {
    const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
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
            const base64 = encodedBody.replace(/-/g, '+').replace(/_/g, '/');
            return decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        } catch (e) {
            console.error('Error decoding message body:', e);
            return '(Не удалось декодировать содержимое письма)';
        }
    }
    return '';
};

const gmailFetch = async (url: string, accessToken: string, options: RequestInit = {}) => {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const error = await response.json();
        const errorMessage = error.error?.message || "Unknown Gmail API error";
         if (errorMessage.includes("API not enabled") || errorMessage.includes("accessNotConfigured")) {
            throw new Error("API Gmail не включено в вашем проекте Google Cloud. Перейдите в Google Cloud Console, найдите 'Gmail API' и нажмите 'Enable'.");
        }
        throw new Error(`Ошибка Gmail API: ${errorMessage}`);
    }
    return response.json();
};

export const sendEmail = async (params: SendEmailParams, accessToken: string): Promise<void> => {
    const { to, from, fromName, subject, body } = params;

    const emailLines = [
        `From: "${fromName}" <${from}>`,
        `To: ${to}`,
        `Content-type: text/html;charset=utf-8`,
        `Subject: ${subject}`,
        '',
        body.replace(/\n/g, '<br>')
    ];
    const email = emailLines.join('\r\n');
    const base64EncodedEmail = btoa(unescape(encodeURIComponent(email))).replace(/\+/g, '-').replace(/\//g, '_');

    await gmailFetch(`${GMAIL_API_BASE_URL}/messages/send`, accessToken, {
        method: 'POST',
        body: JSON.stringify({
            raw: base64EncodedEmail
        })
    });
};

export const listMessages = async (accessToken: string, maxResults = 20): Promise<Email[]> => {
    const listResponse = await gmailFetch(`${GMAIL_API_BASE_URL}/messages?maxResults=${maxResults}&labelIds=INBOX`, accessToken);

    const messages = listResponse.messages || [];
    if (messages.length === 0) {
        return [];
    }

    // Using Promise.all for batching requests with fetch
    const messagePromises = messages.map((message: { id: string }) =>
        gmailFetch(`${GMAIL_API_BASE_URL}/messages/${message.id}`, accessToken)
    );

    const fullMessages = await Promise.all(messagePromises);

    return fullMessages.map((msg: any) => {
        const headers = msg.payload?.headers || [];
        return {
            id: msg.id || '',
            from: getHeader(headers, 'From'),
            subject: getHeader(headers, 'Subject'),
            snippet: msg.snippet || '',
            body: getBody(msg),
        };
    }).filter((email): email is Email => email !== null);
};