import {
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    Unsubscribe,
    Timestamp,
    serverTimestamp,
    getDoc,
} from 'firebase/firestore';
import { db } from './firebase';
// FIX: Corrected import path for types
import type { Profile, Job, Interaction } from '../types';

// --- Profiles ---

export const getProfiles = (userId: string, onUpdate: (profiles: Profile[]) => void): Unsubscribe => {
    if (!db) return () => {};
    const profilesCollection = collection(db, 'profiles');
    const q = query(profilesCollection, where('userId', '==', userId));
    return onSnapshot(q, (querySnapshot) => {
        const profiles: Profile[] = [];
        querySnapshot.forEach((doc) => {
            profiles.push({ id: doc.id, ...doc.data() } as Profile);
        });
        onUpdate(profiles);
    });
};

export const addProfile = async (userId: string, profileData: Omit<Profile, 'id' | 'userId'>): Promise<string> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const profilesCollection = collection(db, 'profiles');
    const docRef = await addDoc(profilesCollection, {
        ...profileData,
        userId,
    });
    return docRef.id;
};

export const updateProfile = async (profileId: string, updates: Partial<Profile>): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const profileDoc = doc(db, 'profiles', profileId);
    await updateDoc(profileDoc, updates);
};

export const deleteProfile = async (profileId: string): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    await deleteDoc(doc(db, 'profiles', profileId));
};

// --- Jobs ---

export const getJobs = (userId: string, profileId: string, onUpdate: (jobs: Job[]) => void): Unsubscribe => {
    if (!db || !userId || !profileId) {
        onUpdate([]);
        return () => {}; // Return an empty unsubscribe function
    }
    const jobsCollection = collection(db, 'jobs');
    const q = query(jobsCollection, where('userId', '==', userId), where('profileId', '==', profileId));
    return onSnapshot(q, (querySnapshot) => {
        const jobs: Job[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Firestore timestamps need to be converted
            const history = (data.history || []).map((item: any) => ({
                ...item,
                timestamp: item.timestamp instanceof Timestamp ? item.timestamp.toDate().toISOString() : item.timestamp,
            }));
            jobs.push({ id: doc.id, ...data, history } as Job);
        });
        onUpdate(jobs);
    });
};

export const addJob = async (userId: string, profileId: string, jobData: Omit<Job, 'id' | 'userId' | 'profileId'>): Promise<string> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const jobsCollection = collection(db, 'jobs');
    const docRef = await addDoc(jobsCollection, {
        ...jobData,
        userId,
        profileId,
        createdAt: serverTimestamp()
    });
    return docRef.id;
};

export const addJobsBatch = async (userId: string, profileId: string, jobsData: Omit<Job, 'id' | 'userId' | 'profileId'>[]): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    // Firestore batch writes are more efficient for multiple additions.
    // However, for simplicity here, we'll just loop. A real implementation should use `writeBatch`.
    for (const jobData of jobsData) {
        await addJob(userId, profileId, jobData);
    }
};

export const updateJob = async (jobId: string, updates: Partial<Job>): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const jobDoc = doc(db, 'jobs', jobId);
    await updateDoc(jobDoc, updates);
};

export const addJobInteraction = async (jobId: string, interaction: Interaction): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const jobRef = doc(db, 'jobs', jobId);
    const jobSnap = await getDoc(jobRef);
    if(jobSnap.exists()){
        const job = jobSnap.data() as Job;
        const updatedHistory = [...(job.history || []), interaction];
        await updateJob(jobId, { history: updatedHistory });
    }
}


export const deleteJob = async (jobId: string): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    await deleteDoc(doc(db, 'jobs', jobId));
};