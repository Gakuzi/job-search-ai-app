import { 
    collection, 
    query, 
    where, 
    getDocs, 
    doc, 
    setDoc, 
    deleteDoc, 
    writeBatch,
    serverTimestamp,
    orderBy,
    Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import type { Profile, Job, KanbanStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const getProfiles = async (userId: string): Promise<Profile[]> => {
    const q = query(collection(db, 'profiles'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Profile));
};

export const saveProfile = async (profile: Partial<Profile> & { userId: string }): Promise<string> => {
    const profileId = profile.id || uuidv4();
    const profileRef = doc(db, 'profiles', profileId);
    
    // Create a new object for Firestore to avoid mutating the original
    const dataToSave: any = { ...profile, id: profileId };
    if (!profile.id) {
        dataToSave.createdAt = serverTimestamp();
    }

    await setDoc(profileRef, dataToSave, { merge: true });
    return profileId;
};


export const deleteProfile = async (profileId: string): Promise<void> => {
    // Also delete associated jobs
    const jobsSnapshot = await getDocs(query(collection(db, 'jobs'), where('profileId', '==', profileId)));
    const batch = writeBatch(db);
    jobsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });
    batch.delete(doc(db, 'profiles', profileId));
    await batch.commit();
};


export const getTrackedJobs = async (userId: string): Promise<Job[]> => {
    const q = query(collection(db, 'jobs'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));
};

export const saveTrackedJobs = async (jobsToSave: Job[]): Promise<void> => {
    if (jobsToSave.length === 0) return;
    const batch = writeBatch(db);
    jobsToSave.forEach(jobData => {
        const jobRef = doc(db, 'jobs', jobData.id);
        batch.set(jobRef, {
            ...jobData,
            kanbanStatus: 'new', // All new jobs start in the 'new' column
        });
    });
    await batch.commit();
};

export const updateJobStatus = async (jobId: string, newStatus: KanbanStatus): Promise<void> => {
    const jobRef = doc(db, 'jobs', jobId);
    await setDoc(jobRef, { kanbanStatus: newStatus }, { merge: true });
};

export const deleteTrackedJob = async (jobId: string): Promise<void> => {
    const jobRef = doc(db, 'jobs', jobId);
    await deleteDoc(jobRef);
};
