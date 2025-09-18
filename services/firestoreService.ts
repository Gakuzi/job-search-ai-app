import {
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    writeBatch,
    getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Profile, Job, SearchSettings, Prompts } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_PROMPTS } from '../constants';


// --- Profiles ---

export const subscribeToProfiles = (userId: string, callback: (profiles: Profile[]) => void) => {
    const q = query(collection(db, 'profiles'), where('userId', '==', userId));
    return onSnapshot(q, (snapshot) => {
        // FIX: Implement deep, manual object construction to aggressively sanitize data.
        // This prevents non-serializable internal Firebase objects (which appear during
        // offline/error states) from entering React state, even if nested inside other objects.
        // This is the definitive fix for the "circular structure" error.
        const profiles = snapshot.docs.map(doc => {
            const data = doc.data() || {};
            const settings: Partial<SearchSettings> = data.settings || {};
            const prompts: Partial<Prompts> = data.prompts || {};

            const cleanProfile: Profile = {
                id: doc.id,
                userId: data.userId || '',
                name: data.name || '',
                resume: data.resume || '',
                settings: {
                    positions: settings.positions || '',
                    salary: settings.salary || 0,
                    currency: settings.currency || 'RUB',
                    location: settings.location || '',
                    remote: typeof settings.remote === 'boolean' ? settings.remote : false,
                    employment: Array.isArray(settings.employment) ? [...settings.employment] : [],
                    schedule: Array.isArray(settings.schedule) ? [...settings.schedule] : [],
                    skills: settings.skills || '',
                    keywords: settings.keywords || '',
                    minCompanyRating: settings.minCompanyRating || 0,
                    limit: settings.limit || 0,
                },
                prompts: {
                    jobSearch: prompts.jobSearch || DEFAULT_PROMPTS.jobSearch,
                    resumeAdapt: prompts.resumeAdapt || DEFAULT_PROMPTS.resumeAdapt,
                    coverLetter: prompts.coverLetter || DEFAULT_PROMPTS.coverLetter,
                    hrResponseAnalysis: prompts.hrResponseAnalysis || DEFAULT_PROMPTS.hrResponseAnalysis,
                    shortMessage: prompts.shortMessage || DEFAULT_PROMPTS.shortMessage,
                },
            };
            return cleanProfile;
        });
        callback(profiles);
    });
};


export const addProfile = async (profileData: Omit<Profile, 'id'>): Promise<Profile> => {
    const docRef = await addDoc(collection(db, 'profiles'), profileData);
    return { id: docRef.id, ...profileData };
};

export const updateProfile = (profile: Profile) => {
    const { id, ...data } = profile;
    return updateDoc(doc(db, 'profiles', id), data);
};

export const deleteProfile = async (profileId: string) => {
    // Also delete associated jobs
    const jobsQuery = query(collection(db, 'jobs'), where('profileId', '==', profileId));
    const jobsSnapshot = await getDocs(jobsQuery);
    const batch = writeBatch(db);
    jobsSnapshot.forEach(jobDoc => {
        batch.delete(doc(db, 'jobs', jobDoc.id));
    });
    await batch.commit();

    // Delete the profile itself
    return deleteDoc(doc(db, 'profiles', profileId));
};

// --- Jobs ---

export const subscribeToJobs = (userId: string, callback: (jobs: Job[]) => void) => {
    const q = query(collection(db, 'jobs'), where('userId', '==', userId));
    return onSnapshot(q, (snapshot) => {
        // FIX: Manually construct the Job object for the same reason as subscribeToProfiles.
        // This ensures data purity and prevents crashes from circular references in the state.
        const jobs = snapshot.docs.map(doc => {
            const data = doc.data() || {};
            const contacts = data.contacts || {};
            
            const cleanJob: Job = {
                id: doc.id,
                title: data.title || '',
                company: data.company || '',
                companyRating: data.companyRating || 0,
                companyReviewSummary: data.companyReviewSummary || '',
                salary: data.salary || '',
                location: data.location || '',
                description: data.description || '',
                responsibilities: Array.isArray(data.responsibilities) ? [...data.responsibilities] : [],
                requirements: Array.isArray(data.requirements) ? [...data.requirements] : [],
                matchAnalysis: data.matchAnalysis || '',
                url: data.url || '',
                contacts: {
                    email: contacts.email,
                    phone: contacts.phone,
                    telegram: contacts.telegram,
                },
                kanbanStatus: data.kanbanStatus || 'new',
                notes: data.notes || undefined,
                profileId: data.profileId || '',
                userId: data.userId || '',
            };
             if (!cleanJob.contacts?.email && !cleanJob.contacts?.phone && !cleanJob.contacts?.telegram) {
                delete cleanJob.contacts;
            }
            return cleanJob;
        });
        callback(jobs);
    });
};

// FIX: Corrected parameter type from `Omit<Job, 'id'>[]` to `Job[]`.
// The previous type caused an error because `jobData.id` was being accessed on an object where it was explicitly omitted.
// This change ensures the type matches the data received from the Gemini service, which includes an ID.
export const addJobsBatch = async (jobs: Job[]) => {
    const batch = writeBatch(db);
    jobs.forEach(jobData => {
        // The Gemini schema provides an ID, but we'll use Firestore's for consistency if needed.
        // For this use case, using Gemini's UUID is fine as it's generated client-side.
        const jobWithOurId = {...jobData, id: jobData.id || uuidv4()};
        const docRef = doc(db, 'jobs', jobWithOurId.id);
        batch.set(docRef, jobWithOurId);
    });
    await batch.commit();
};

export const updateJob = (jobId: string, updates: Partial<Job>) => {
    return updateDoc(doc(db, 'jobs', jobId), updates);
};

export const deleteJob = (jobId: string) => {
    return deleteDoc(doc(db, 'jobs', jobId));
};