// FIX: Add reference for GAPI to resolve gapi.client type errors.
/// <reference types="gapi" />

import type { GmailThread, GmailMessage } from "../types";

interface SendEmailParams {
    to: string;
    from: string;
    fromName: string;
    subject: string;
    body: string;
}

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

export const listThreads = async (query: string): Promise<GmailThread[]> => {
    const response = await gapi.client.gmail.users.threads.list({
        userId: 'me',
        q: query,
        maxResults: 10,
    });

    return (response.result.threads || []) as GmailThread[];
};


export const getThread = async (threadId: string): Promise<GmailThread> => {
    const response = await gapi.client.gmail.users.threads.get({
        userId: 'me',
        id: threadId,
        format: 'full'
    });
    return response.result as GmailThread;
}
