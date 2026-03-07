import { db } from '../config/firebase';
import { collection, addDoc, getDocs, getDoc, doc, query, where, writeBatch } from 'firebase/firestore';
import { Patient, CallAnalysis, CaseLog } from '../types';

const PATIENTS_COLLECTION = 'residents';
const CALLS_COLLECTION = 'calls';
const CASES_COLLECTION = 'cases';

export async function fetchPatients(): Promise<Patient[]> {
  try {
    const querySnapshot = await getDocs(collection(db, PATIENTS_COLLECTION));
    const patients: Patient[] = [];
    querySnapshot.forEach((doc) => {
      patients.push({ id: doc.id, ...doc.data() } as Patient);
    });
    return patients;
  } catch (error) {
    console.error('Error fetching patients:', error);
    throw error;
  }
}

export async function fetchPatientById(patientId: string): Promise<Patient | null> {
  try {
    const docRef = doc(db, PATIENTS_COLLECTION, patientId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Patient;
    }
    return null;
  } catch (error) {
    console.error('Error fetching patient:', error);
    throw error;
  }
}

export async function createPatient(patient: Omit<Patient, 'id'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, PATIENTS_COLLECTION), patient);
    return docRef.id;
  } catch (error) {
    console.error('Error creating patient:', error);
    throw error;
  }
}

// calls
export async function fetchCalls(): Promise<CallAnalysis[]> {
  try {
    const querySnapshot = await getDocs(collection(db, CALLS_COLLECTION));
    const calls: CallAnalysis[] = [];
    querySnapshot.forEach((doc) => {
      calls.push({ id: doc.id, ...doc.data() } as CallAnalysis);
    });
    return calls;
  } catch (error) {
    console.error('Error fetching calls:', error);
    throw error;
  }
}

export async function fetchCallById(callId: string): Promise<CallAnalysis | null> {
  try {
    const docRef = doc(db, CALLS_COLLECTION, callId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as CallAnalysis;
    }
    return null;
  } catch (error) {
    console.error('Error fetching call:', error);
    throw error;
  }
}

export async function fetchCallsByPatient(patientId: string): Promise<CallAnalysis[]> {
  try {
    const q = query(collection(db, CALLS_COLLECTION), where('patientId', '==', patientId));
    const querySnapshot = await getDocs(q);
    const calls: CallAnalysis[] = [];
    querySnapshot.forEach((doc) => {
      calls.push({ id: doc.id, ...doc.data() } as CallAnalysis);
    });
    return calls;
  } catch (error) {
    console.error('Error fetching calls by patient:', error);
    throw error;
  }
}

export async function createCall(call: Omit<CallAnalysis, 'id'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, CALLS_COLLECTION), call);
    return docRef.id;
  } catch (error) {
    console.error('Error creating call:', error);
    throw error;
  }
}

// cases
export async function fetchCases(): Promise<CaseLog[]> {
  try {
    const querySnapshot = await getDocs(collection(db, CASES_COLLECTION));
    const cases: CaseLog[] = [];
    querySnapshot.forEach((doc) => {
      cases.push({ caseId: doc.id, ...doc.data() } as CaseLog);
    });
    return cases;
  } catch (error) {
    console.error('Error fetching cases:', error);
    throw error;
  }
}

export async function fetchCaseById(caseId: string): Promise<CaseLog | null> {
  try {
    const docRef = doc(db, CASES_COLLECTION, caseId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { caseId: docSnap.id, ...docSnap.data() } as CaseLog;
    }
    return null;
  } catch (error) {
    console.error('Error fetching case:', error);
    throw error;
  }
}

export async function createCase(caseLog: Omit<CaseLog, 'caseId'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, CASES_COLLECTION), caseLog);
    return docRef.id;
  } catch (error) {
    console.error('Error creating case:', error);
    throw error;
  }
}

// sample 
export async function seedSampleData(): Promise<void> {
  try {
    const batch = writeBatch(db);

    // Sample Patient (Resident)
    const patientRef = doc(collection(db, PATIENTS_COLLECTION), 'PT001');
    batch.set(patientRef, {
      name: 'Pauline Goh',
      age: 64,
      medicalHistory: 'History: Hypertension',
      address: '3 Everton Prk',
      phone: '(+65) 9123 4567',
      priority: 'PRIORITY I',
      latitude: 1.3521,
      longitude: 103.8198,
      familyContact: 'John Goh',
      createdAt: new Date().toISOString(),
    });

    // Sample Call Analysis
    const callRef = doc(collection(db, CALLS_COLLECTION), 'CALL001');
    batch.set(callRef, {
      patientId: 'PT001',
      timestamp: new Date().toISOString(),
      status: 'ACTIVE',
      audioUrl: null,
      audioDuration: 134,
      acousticFindings: [
        {
          id: 'af1',
          name: 'Impact Detected',
          confidence: 98,
          description: 'High confidence detection',
        },
        {
          id: 'af2',
          name: 'Heavy Breathing',
          confidence: 96,
          description: 'Irregular Pattern',
        },
        {
          id: 'af3',
          name: 'Glass Breaking',
          confidence: 87,
          description: 'Background noise',
        },
      ],
      patientContext: {
        homeAutomation: 'Home automation reported sudden fall via floor sensor',
        livingStatus: 'Patient lives alone; wife is in care facility.',
        familyStatus: 'Wife is in care facility',
        smartwatchData: {
          heartRate: 115,
          status: 'Elevated',
        },
      },
      triageSuggestion: {
        protocol: 'Code Red Protocol',
        severity: 'URGENT',
        reason: 'Suspected cardiac event following trauma from fall. Immediate dispatch required.',
        units: ['ALS Unit', 'Cardiology Alert'],
        details: ['Cardiovascular alert', 'Trauma protocol'],
      },
      transcript: [
        {
          time: '00:12',
          originalText: '¡Ayuda! Por favor, me he caído y no puedo levantarme.',
          originalLanguage: 'ES',
          translatedText: "Help! Please, I've fallen and I can't get up.",
          translatedLanguage: 'EN',
          keywords: ['FALL', 'HELP'],
        },
        {
          time: '00:45',
          originalText: 'Me duele mucho el pecho. Es como una presión.',
          originalLanguage: 'ES',
          translatedText: "My chest hurts a lot. It's like pressure.",
          translatedLanguage: 'EN',
          keywords: ['CHEST PAIN'],
        },
      ],
    });

    // Sample Cases
    const sampleCases = [
      {
        time: '14:02',
        status: 'URGENT',
        location: '123 Maple St',
        patient: 'John Doe',
        primaryConcern: 'Suspected MI / Fall',
      },
      {
        time: '14:05',
        status: 'UNCERTAIN',
        location: '882 West Ave',
        patient: 'Mary Smith',
        primaryConcern: 'Panic / Shortness of Breath',
      },
      {
        time: '14:10',
        status: 'NON-URGENT',
        location: 'Public Park Sect. 4',
        patient: 'Unknown',
        primaryConcern: 'Public Nuisance',
      },
      {
        time: '14:12',
        status: 'URGENT',
        location: '45 Skyline Dr',
        patient: 'David Miller',
        primaryConcern: 'Severe Allergic Reaction',
      },
    ];

    sampleCases.forEach((caseData, index) => {
      const caseRef = doc(
        collection(db, CASES_COLLECTION),
        `#EM-2024-${89 + index * 3}`
      );
      batch.set(caseRef, {
        ...caseData,
        createdAt: new Date().toISOString(),
      });
    });

    await batch.commit();
    console.log('Sample data seeded successfully');
  } catch (error) {
    console.error('Error seeding sample data:', error);
    throw error;
  }
}