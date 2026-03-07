import { db } from '../config/firebase';
import { collection, addDoc, getDocs, getDoc, doc, query, where, writeBatch, deleteDoc } from 'firebase/firestore';
import { Resident, CallAnalysis, CaseLog } from '../types';

const RESIDENTS_COLLECTION = 'residents';
const CALLS_COLLECTION = 'calls';
const CASES_COLLECTION = 'cases';

// Helper function to generate unique case IDs
function generateCaseId(): string {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(Math.random() * 900) + 100; // 3-digit random number
  return `#EM-${year}-${randomNum}`;
}

export async function fetchResidents(): Promise<Resident[]> {
  try {
    const querySnapshot = await getDocs(collection(db, RESIDENTS_COLLECTION));
    const residents: Resident[] = [];
    querySnapshot.forEach((doc) => {
      residents.push({ id: doc.id, ...doc.data() } as Resident);
    });
    return residents;
  } catch (error) {
    console.error('Error fetching residents:', error);
    throw error;
  }
}

export async function fetchResidentById(residentId: string): Promise<Resident | null> {
  try {
    const docRef = doc(db, RESIDENTS_COLLECTION, residentId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Resident;
    }
    return null;
  } catch (error) {
    console.error('Error fetching resident:', error);
    throw error;
  }
}

export async function createResident(resident: Omit<Resident, 'id'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, RESIDENTS_COLLECTION), resident);
    return docRef.id;
  } catch (error) {
    console.error('Error creating resident:', error);
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

export async function fetchCallsByResident(residentId: string): Promise<CallAnalysis[]> {
  try {
    const q = query(collection(db, CALLS_COLLECTION), where('residentId', '==', residentId));
    const querySnapshot = await getDocs(q);
    const calls: CallAnalysis[] = [];
    querySnapshot.forEach((doc) => {
      calls.push({ id: doc.id, ...doc.data() } as CallAnalysis);
    });
    return calls;
  } catch (error) {
    console.error('Error fetching calls by resident:', error);
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
      const data = doc.data();
      cases.push({ 
        caseId: data.caseId || doc.id, // Use caseId field if exists, otherwise use document ID
        ...data 
      } as CaseLog);
    });
    return cases;
  } catch (error) {
    console.error('Error fetching cases:', error);
    throw error;
  }
}

export async function fetchCasesByResident(residentId: string): Promise<CaseLog[]> {
  try {
    const q = query(collection(db, CASES_COLLECTION), where('residentId', '==', residentId));
    const querySnapshot = await getDocs(q);
    const cases: CaseLog[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      cases.push({ 
        caseId: data.caseId || doc.id, // Use caseId field if exists, otherwise use document ID
        ...data 
      } as CaseLog);
    });
    return cases;
  } catch (error) {
    console.error('Error fetching cases by resident:', error);
    throw error;
  }
}

export async function fetchCaseById(caseId: string): Promise<CaseLog | null> {
  try {
    // First try to fetch by document ID (for backward compatibility with seed data)
    const docRef = doc(db, CASES_COLLECTION, caseId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return { 
        caseId: data.caseId || docSnap.id, 
        ...data 
      } as CaseLog;
    }
    
    // If not found by document ID, query by caseId field
    const q = query(collection(db, CASES_COLLECTION), where('caseId', '==', caseId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { caseId: doc.data().caseId, ...doc.data() } as CaseLog;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching case:', error);
    throw error;
  }
}

export async function createCase(caseLog: Omit<CaseLog, 'caseId'>): Promise<string> {
  try {
    // Generate a unique case ID
    const caseId = generateCaseId();
    
    // Create the case document with the generated caseId
    const caseWithId = {
      ...caseLog,
      caseId,
      createdAt: new Date().toISOString(),
    };
    
    const docRef = await addDoc(collection(db, CASES_COLLECTION), caseWithId);
    console.log('Case created with ID:', caseId, 'Document ID:', docRef.id);
    return caseId; // Return the caseId instead of docRef.id
  } catch (error) {
    console.error('Error creating case:', error);
    throw error;
  }
}

// Clear all cases and reseed with updated data
export async function clearAndReseedData(): Promise<void> {
  try {
    console.log('Clearing existing cases...');
    
    // Delete all existing cases
    const casesSnapshot = await getDocs(collection(db, CASES_COLLECTION));
    const deletePromises = casesSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    console.log('Reseeding sample data...');
    await seedSampleData();
    
    console.log('Database cleared and reseeded successfully!');
  } catch (error) {
    console.error('Error clearing and reseeding data:', error);
    throw error;
  }
}

// sample 
export async function seedSampleData(): Promise<void> {
  try {
    const batch = writeBatch(db);

    // Sample Residents 
    const residents = [
      {
        id: 'PT001',
        name: 'Pauline Goh',
        age: 64,
        medicalHistory: 'History: Hypertension, Previous cardiac event',
        address: '3 Everton Prk',
        postalCode: '287953',
        phone: '(+65) 9123 4567',
        priority: 'PRIORITY I',
        status: 'URGENT',
        latitude: 1.3521,
        longitude: 103.8198,
        familyContact: 'John Goh',
      },
      {
        id: 'PT002',
        name: 'Henry Tan',
        age: 72,
        medicalHistory: 'Diabetes, Hypertension, Arthritis',
        address: '882 West Ave',
        postalCode: '288632',
        phone: '(+65) 8765 4321',
        priority: 'PRIORITY I',
        status: 'URGENT',
        latitude: 1.3726,
        longitude: 103.8489,
        familyContact: 'Alex Tan',
      },
      {
        id: 'PT003',
        name: 'Margaret Wong',
        age: 58,
        medicalHistory: 'Asthma, Anxiety disorder',
        address: '45 Skyline Dr',
        postalCode: '291234',
        phone: '(+65) 9876 5432',
        priority: 'PRIORITY II',
        status: 'UNCERTAIN',
        latitude: 1.3410,
        longitude: 103.7680,
        familyContact: 'David Wong',
      },
      {
        id: 'PT004',
        name: 'Richard Lee',
        age: 45,
        medicalHistory: 'No significant medical history',
        address: '123 Maple St',
        postalCode: '284956',
        phone: '(+65) 6123 4567',
        priority: 'PRIORITY III',
        status: 'NON-URGENT',
        latitude: 1.3589,
        longitude: 103.9384,
        familyContact: 'Susan Lee',
      },
    ];

    // Add residents to batch
    residents.forEach((resident) => {
      const residentRef = doc(collection(db, RESIDENTS_COLLECTION), resident.id);
      batch.set(residentRef, {
        ...resident,
        createdAt: new Date().toISOString(),
      });
    });

    // Sample Call Analysis 
    const callRef = doc(collection(db, CALLS_COLLECTION), 'CALL001');
    batch.set(callRef, {
      residentId: 'PT001',
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
      residentContext: {
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
        residentId: 'PT001',
        time: '14:02',
        status: 'URGENT',
        location: '3 Everton Prk',
        residentName: 'Pauline Goh',
        primaryConcern: 'Suspected MI / Fall',
      },
      {
        residentId: 'PT002',
        time: '14:05',
        status: 'UNCERTAIN',
        location: '882 West Ave',
        residentName: 'Henry Tan',
        primaryConcern: 'Panic / Shortness of Breath',
      },
      {
        residentId: 'PT003',
        time: '13:30',
        status: 'NON-URGENT',
        location: '45 Skyline Dr',
        residentName: 'Margaret Wong',
        primaryConcern: 'Anxiety episode',
      },
      {
        residentId: 'PT004',
        time: '14:12',
        status: 'URGENT',
        location: '123 Maple St',
        residentName: 'Richard Lee',
        primaryConcern: 'Severe Allergic Reaction',
      },
    ];

    sampleCases.forEach((caseData, index) => {
      const caseId = `#EM-2024-${89 + index * 3}`;
      const caseRef = doc(
        collection(db, CASES_COLLECTION),
        caseId
      );
      batch.set(caseRef, {
        ...caseData,
        caseId, // Include caseId as a field in the document
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