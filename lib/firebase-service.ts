// Firebase Firestore CRUD işlemleri

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, auth } from './firebaseClient';
import { Carrier, CreateCarrierData, CreateOperationData, Operation, User, Document, Customer, CustomerFormData, OperationFormData } from './types';

// Koleksiyon referansları
const COLLECTIONS = {
  USERS: 'users',
  CARRIERS: 'carriers', 
  OPERATIONS: 'operations',
  DOCUMENTS: 'documents',
  CUSTOMERS: 'customers'
} as const;

// Utility: Date objesini Firestore Timestamp'e çevir
const toTimestamp = (date: Date) => Timestamp.fromDate(date);
const fromTimestamp = (timestamp: Timestamp) => timestamp.toDate();

// Güvenli timestamp dönüştürme
const safeFromTimestamp = (timestamp: unknown): Date => {
  if (!timestamp || typeof (timestamp as { toDate?: unknown })?.toDate !== 'function') {
    return new Date();
  }
  try {
    return (timestamp as { toDate: () => Date }).toDate();
  } catch (error) {
    console.warn('Invalid timestamp:', timestamp);
    return new Date();
  }
};

// ===== USER İŞLEMLERİ =====

export const createUser = async (userData: Omit<User, 'id'>): Promise<string> => {
  const userRef = await addDoc(collection(db, COLLECTIONS.USERS), {
    ...userData,
    createdAt: toTimestamp(userData.createdAt),
    updatedAt: toTimestamp(userData.updatedAt)
  });
  return userRef.id;
};

export const getUser = async (userId: string): Promise<User | null> => {
  const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId));
  if (!userDoc.exists()) return null;
  
  const data = userDoc.data();
  return {
    id: userDoc.id,
    ...data,
    createdAt: safeFromTimestamp(data.createdAt),
    updatedAt: safeFromTimestamp(data.updatedAt)
  } as User;
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  try {
    console.log('Searching for user with email:', email);
    const q = query(collection(db, COLLECTIONS.USERS), where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log('No user found with email:', email);
      return null;
    }
    
    const userDoc = querySnapshot.docs[0];
    const data = userDoc.data();
    console.log('User found:', data);
    
    return {
      id: userDoc.id,
      ...data,
      createdAt: safeFromTimestamp(data.createdAt),
      updatedAt: safeFromTimestamp(data.updatedAt)
    } as User;
  } catch (error: unknown) {
    console.error('Error getting user by email:', error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Kullanıcı bilgileri alınamadı: ${message}`);
  }
};

export const saveUser = async (userData: Omit<User, 'id'>): Promise<User> => {
  try {
    const userRef = await addDoc(collection(db, COLLECTIONS.USERS), {
      ...userData,
      createdAt: toTimestamp(userData.createdAt),
      updatedAt: toTimestamp(userData.updatedAt)
    });
    
    return {
      id: userRef.id,
      ...userData
    } as User;
  } catch (error: unknown) {
    console.error('Error saving user:', error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Kullanıcı kaydedilemedi: ${message}`);
  }
};

export const getAllUsers = async (): Promise<User[]> => {
  const querySnapshot = await getDocs(
    query(collection(db, COLLECTIONS.USERS), orderBy('createdAt', 'desc'))
  );
  
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: safeFromTimestamp(data.createdAt),
      updatedAt: safeFromTimestamp(data.updatedAt)
    } as User;
  });
};

export const updateUser = async (userId: string, updates: Partial<User>): Promise<void> => {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  const updatedData: Record<string, unknown> = { ...updates, updatedAt: toTimestamp(new Date()) };
  
  // Timestamp alanları varsa dönüştür
  if (updatedData.createdAt instanceof Date) {
    updatedData.createdAt = toTimestamp(updatedData.createdAt);
  }
  
  await updateDoc(userRef, updatedData);
};

export const deleteUser = async (userId: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTIONS.USERS, userId));
};

// ===== CARRIER İŞLEMLERİ =====

export const createCarrier = async (carrierData: CreateCarrierData): Promise<Carrier> => {
  const now = new Date();
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    throw new Error('Kullanıcı oturumu bulunamadı');
  }

  // Çoklu araç desteği: vehicles alanı varsa onu kullan, yoksa single plaka'dan üret
  const vehicles = (carrierData.vehicles && carrierData.vehicles.length > 0)
    ? carrierData.vehicles.map(v => ({ id: crypto.randomUUID(), plaka: v.plaka, aracTipi: v.aracTipi }))
    : (carrierData.plaka
        ? [{ id: crypto.randomUUID(), plaka: carrierData.plaka, aracTipi: 'Belirtilmemiş' }]
        : []);

  const fullCarrierData = {
    firmaAdi: carrierData.firmaAdi,
    firmaTuru: carrierData.firmaTuru || 'Sahis',
    vergiDairesi: carrierData.vergiDairesi || '',
    vergiNumarasi: carrierData.vergiNumarasi || '',
    adres: carrierData.adres,
    il: carrierData.il || '',
    ilce: carrierData.ilce || '',
    yetkiliKisi: carrierData.yetkiliKisi || '',
    telefon: carrierData.telefon,
    iban: carrierData.iban,
    email: carrierData.email || '',
    vehicles,
    createdAt: toTimestamp(now),
    updatedAt: toTimestamp(now),
    createdBy: currentUser.uid,
    isActive: carrierData.isActive ?? true
  };

  const carrierRef = await addDoc(collection(db, COLLECTIONS.CARRIERS), fullCarrierData);
  
  return {
    id: carrierRef.id,
    firmaAdi: carrierData.firmaAdi,
    firmaTuru: fullCarrierData.firmaTuru,
    vergiDairesi: fullCarrierData.vergiDairesi,
    vergiNumarasi: fullCarrierData.vergiNumarasi,
    adres: carrierData.adres,
    il: fullCarrierData.il,
    ilce: fullCarrierData.ilce,
    yetkiliKisi: fullCarrierData.yetkiliKisi,
    telefon: carrierData.telefon,
    iban: carrierData.iban,
    email: carrierData.email || '',
    vehicles,
    createdAt: now,
    updatedAt: now,
    createdBy: currentUser.uid,
    isActive: fullCarrierData.isActive
  };
};

export const getCarrier = async (carrierId: string): Promise<Carrier | null> => {
  const carrierDoc = await getDoc(doc(db, COLLECTIONS.CARRIERS, carrierId));
  if (!carrierDoc.exists()) return null;
  
  const data = carrierDoc.data();
  return {
    id: carrierDoc.id,
    ...data,
    vehicles: data.vehicles || [], // vehicles dizisi yoksa boş dizi ata
    createdAt: safeFromTimestamp(data.createdAt),
    updatedAt: safeFromTimestamp(data.updatedAt)
  } as Carrier;
};

export const getAllCarriers = async (): Promise<Carrier[]> => {
  const querySnapshot = await getDocs(
    query(collection(db, COLLECTIONS.CARRIERS), orderBy('createdAt', 'desc'))
  );
  
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      vehicles: data.vehicles || [], // vehicles dizisi yoksa boş dizi ata
      createdAt: data.createdAt ? fromTimestamp(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? fromTimestamp(data.updatedAt) : new Date()
    } as Carrier;
  });
};

export const updateCarrier = async (carrierId: string, updates: Partial<Carrier>): Promise<void> => {
  const carrierRef = doc(db, COLLECTIONS.CARRIERS, carrierId);
  const updatedData: Record<string, unknown> = { ...updates, updatedAt: toTimestamp(new Date()) };
  
  if (updatedData.createdAt instanceof Date) {
    updatedData.createdAt = toTimestamp(updatedData.createdAt);
  }
  
  await updateDoc(carrierRef, updatedData);
};

export const deleteCarrier = async (carrierId: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTIONS.CARRIERS, carrierId));
};

// ===== OPERASYON İŞLEMLERİ =====

export const createOperation = async (operationData: CreateOperationData): Promise<Operation> => {
  const now = new Date();
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    throw new Error('Kullanıcı oturumu bulunamadı');
  }

  // Nakliyeci bilgisini al
  const carrier = await getCarrier(operationData.carrierId);
  if (!carrier) {
    throw new Error('Nakliyeci bulunamadı');
  }

  // Sefer numarası oluştur (tarih + rastgele)
  const seferNo = `SF${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  // Araç bilgilerini güvenli şekilde al
  const firstVehicle = carrier.vehicles && carrier.vehicles.length > 0 ? carrier.vehicles[0] : null;

  const fullOperationData = {
    seferNo,
    tasimaTipi: 'FTL' as const,
    carrierId: operationData.carrierId,
    carrierName: carrier.firmaAdi,
    vehicleId: firstVehicle?.id || 'default',
    vehiclePlaka: firstVehicle?.plaka || 'Belirtilmemiş',
    vehicleType: firstVehicle?.aracTipi || 'Belirtilmemiş',
    cekiciPlaka: firstVehicle?.plaka || '',
    yuklemetarihi: toTimestamp(operationData.operationDate || now),
    bosaltmaTarihi: toTimestamp(operationData.dueDate || now),
    siparisTarihi: toTimestamp(now),
    cikisNoktasi: 'Belirtilmemiş',
    varisNoktasi: 'Belirtilmemiş',
    yuklemeAdresi: 'Belirtilmemiş',
    varisAdresi: 'Belirtilmemiş',
    musteriAdi: 'Belirtilmemiş',
    gondericifirma: 'Belirtilmemiş',
    aliciirma: 'Belirtilmemiş',
    tedarikciirma: 'Belirtilmemiş',
    siparisNo: seferNo,
    irsaliyeNo: '',
    faturaNo: '',
    adet: 0,
    kg: 0,
    desi: 0,
    yukAgirligi: 0,
    malzemeBilgisi: '',
    malBedeli: 0,
    toplamTutar: operationData.amount || 0,
    paraBirimi: operationData.currency || 'TRY' as const,
    vadeSuresi: 0,
    aracMaliyeti: 0,
    navlunSatisTutari: 0,
    kar: 0,
    karYuzde: 0,
    soforAdi: '',
    soforTelefonu: '',
    status: 'tasima_devam_ediyor' as const,
    documents: [],
    isActive: true,
    createdAt: toTimestamp(now),
    updatedAt: toTimestamp(now),
    createdBy: currentUser.uid
  };

  const operationRef = await addDoc(collection(db, COLLECTIONS.OPERATIONS), fullOperationData);
  
  return {
    id: operationRef.id,
    seferNo,
    tasimaTipi: 'FTL',
    carrierId: operationData.carrierId,
    carrierName: carrier.firmaAdi,
    vehicleId: firstVehicle?.id || 'default',
    vehiclePlaka: firstVehicle?.plaka || 'Belirtilmemiş',
    vehicleType: firstVehicle?.aracTipi || 'Belirtilmemiş',
    cekiciPlaka: firstVehicle?.plaka || '',
    yuklemetarihi: operationData.operationDate || now,
    bosaltmaTarihi: operationData.dueDate || now,
    siparisTarihi: now,
    cikisNoktasi: 'Belirtilmemiş',
    varisNoktasi: 'Belirtilmemiş',
    yuklemeAdresi: 'Belirtilmemiş',
    varisAdresi: 'Belirtilmemiş',
    musteriAdi: 'Belirtilmemiş',
    gondericifirma: 'Belirtilmemiş',
    aliciirma: 'Belirtilmemiş',
    tedarikciirma: 'Belirtilmemiş',
    siparisNo: seferNo,
    irsaliyeNo: '',
    faturaNo: '',
    adet: 0,
    kg: 0,
    desi: 0,
    yukAgirligi: 0,
    malzemeBilgisi: '',
    malBedeli: 0,
    toplamTutar: operationData.amount || 0,
    paraBirimi: operationData.currency || 'TRY' as const,
    vadeSuresi: 0,
    aracMaliyeti: 0,
    navlunSatisTutari: 0,
    kar: 0,
    karYuzde: 0,
    soforAdi: '',
    soforTelefonu: '',
    status: 'tasima_devam_ediyor' as const,
    documents: [],
    isActive: true,
    createdAt: now,
    updatedAt: now,
    createdBy: currentUser.uid
  };
};

export const getOperation = async (operationId: string): Promise<Operation | null> => {
  const operationDoc = await getDoc(doc(db, COLLECTIONS.OPERATIONS, operationId));
  if (!operationDoc.exists()) return null;
  
  const data = operationDoc.data();
  return {
    id: operationDoc.id,
    ...data,
    createdAt: fromTimestamp(data.createdAt),
    updatedAt: fromTimestamp(data.updatedAt),
    yuklemetarihi: fromTimestamp(data.yuklemetarihi),
    bosaltmaTarihi: fromTimestamp(data.bosaltmaTarihi),
    siparisTarihi: fromTimestamp(data.siparisTarihi),
    documents: data.documents?.map((doc: unknown) => {
      const d = doc as Record<string, unknown>;
      return {
  id: String(d.id ?? ''),
  type: (d.type as unknown) as Document['type'],
        evrakNo: d.evrakNo ? String(d.evrakNo) : undefined,
        fileName: String(d.fileName ?? ''),
        fileUrl: String(d.fileUrl ?? ''),
        uploadedAt: safeFromTimestamp(d.uploadedAt),
        uploadedBy: String(d.uploadedBy ?? ''),
        faturaTarihi: d.faturaTarihi ? safeFromTimestamp(d.faturaTarihi) : undefined
      } as Document;
    }) || []
  } as Operation;
};

export const getActiveOperations = async (): Promise<Operation[]> => {
  const q = query(
    collection(db, COLLECTIONS.OPERATIONS),
    where('isActive', '==', true),
    orderBy('createdAt', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: safeFromTimestamp(data.createdAt),
      updatedAt: safeFromTimestamp(data.updatedAt),
      yuklemetarihi: safeFromTimestamp(data.yuklemetarihi),
      bosaltmaTarihi: safeFromTimestamp(data.bosaltmaTarihi),
      siparisTarihi: safeFromTimestamp(data.siparisTarihi),
      documents: data.documents?.map((doc: unknown) => {
        const d = doc as Record<string, unknown>;
        return {
          id: String(d.id ?? ''),
          type: (d.type as unknown) as Document['type'],
          evrakNo: d.evrakNo ? String(d.evrakNo) : undefined,
          fileName: String(d.fileName ?? ''),
          fileUrl: String(d.fileUrl ?? ''),
          uploadedAt: safeFromTimestamp(d.uploadedAt),
          uploadedBy: String(d.uploadedBy ?? ''),
          faturaTarihi: d.faturaTarihi ? safeFromTimestamp(d.faturaTarihi) : undefined
        } as Document;
      }) || []
    } as Operation;
  });
};

export const getAllOperations = async (): Promise<Operation[]> => {
  const q = query(
    collection(db, COLLECTIONS.OPERATIONS),
    orderBy('createdAt', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: safeFromTimestamp(data.createdAt),
      updatedAt: safeFromTimestamp(data.updatedAt),
      yuklemetarihi: safeFromTimestamp(data.yuklemetarihi),
      bosaltmaTarihi: safeFromTimestamp(data.bosaltmaTarihi),
      siparisTarihi: safeFromTimestamp(data.siparisTarihi),
      documents: data.documents?.map((doc: unknown) => {
        const d = doc as Record<string, unknown>;
        return {
          id: String(d.id ?? ''),
          type: (d.type as unknown) as Document['type'],
          evrakNo: d.evrakNo ? String(d.evrakNo) : undefined,
          fileName: String(d.fileName ?? ''),
          fileUrl: String(d.fileUrl ?? ''),
          uploadedAt: safeFromTimestamp(d.uploadedAt),
          uploadedBy: String(d.uploadedBy ?? ''),
          faturaTarihi: d.faturaTarihi ? safeFromTimestamp(d.faturaTarihi) : undefined
        } as Document;
      }) || []
    } as Operation;
  });
};

export const getInactiveOperations = async (): Promise<Operation[]> => {
  const q = query(
    collection(db, COLLECTIONS.OPERATIONS),
    where('isActive', '==', false),
    orderBy('createdAt', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: safeFromTimestamp(data.createdAt),
      updatedAt: safeFromTimestamp(data.updatedAt),
      yuklemetarihi: safeFromTimestamp(data.yuklemetarihi),
      bosaltmaTarihi: safeFromTimestamp(data.bosaltmaTarihi),
      siparisTarihi: safeFromTimestamp(data.siparisTarihi),
      documents: data.documents?.map((doc: unknown) => {
        const d = doc as Record<string, unknown>;
        return {
          id: String(d.id ?? ''),
          type: (d.type as unknown) as Document['type'],
          evrakNo: d.evrakNo ? String(d.evrakNo) : undefined,
          fileName: String(d.fileName ?? ''),
          fileUrl: String(d.fileUrl ?? ''),
          uploadedAt: safeFromTimestamp(d.uploadedAt),
          uploadedBy: String(d.uploadedBy ?? ''),
          faturaTarihi: d.faturaTarihi ? safeFromTimestamp(d.faturaTarihi) : undefined
        } as Document;
      }) || []
    } as Operation;
  });
};

export const updateOperation = async (operationId: string, updates: Partial<Operation>): Promise<void> => {
  const operationRef = doc(db, COLLECTIONS.OPERATIONS, operationId);
  const updatedData: Record<string, unknown> = { ...updates, updatedAt: toTimestamp(new Date()) };
  
  // Timestamp alanlarını dönüştür
  if (updatedData.createdAt instanceof Date) {
    updatedData.createdAt = toTimestamp(updatedData.createdAt);
  }
  if (updatedData.yuklemetarihi instanceof Date) {
    updatedData.yuklemetarihi = toTimestamp(updatedData.yuklemetarihi);
  }
  if (updatedData.bosaltmaTarihi instanceof Date) {
    updatedData.bosaltmaTarihi = toTimestamp(updatedData.bosaltmaTarihi);
  }
  if (updatedData.siparisTarihi instanceof Date) {
    updatedData.siparisTarihi = toTimestamp(updatedData.siparisTarihi);
  }
  if (updatedData.documents) {
    updatedData.documents = (updatedData.documents as Document[]).map((doc: Document) => ({
      ...doc,
      uploadedAt: toTimestamp(doc.uploadedAt),
      faturaTarihi: doc.faturaTarihi ? toTimestamp(doc.faturaTarihi) : null
    }));
  }
  
  await updateDoc(operationRef, updatedData);
};

export const deleteOperation = async (operationId: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTIONS.OPERATIONS, operationId));
};

// Yeni: Tam formdan operasyon oluşturma
export const createOperationFromForm = async (
  form: OperationFormData & { elleclemeFaturasi?: boolean; hammaliyeFaturasi?: boolean }
): Promise<Operation> => {
  const now = new Date();
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Kullanıcı oturumu bulunamadı');

  // Kar hesapla
  const kar = (form.navlunSatisTutari ?? 0) - (form.aracMaliyeti ?? 0);
  const maliyet = form.aracMaliyeti ?? 0;
  const karYuzde = maliyet > 0 ? (kar / maliyet) * 100 : 0;

  const data = {
    ...form,
    yuklemetarihi: toTimestamp(form.yuklemetarihi),
    bosaltmaTarihi: toTimestamp(form.bosaltmaTarihi),
    siparisTarihi: toTimestamp(form.siparisTarihi),
    documents: [],
    status: 'tasima_devam_ediyor' as const,
    isActive: true,
    kar,
    karYuzde,
    elleclemeFaturasi: form.elleclemeFaturasi ?? false,
    hammaliyeFaturasi: form.hammaliyeFaturasi ?? false,
    createdAt: toTimestamp(now),
    updatedAt: toTimestamp(now),
    createdBy: currentUser.uid
  };

  const refDoc = await addDoc(collection(db, COLLECTIONS.OPERATIONS), data);

  return {
    id: refDoc.id,
    ...form,
    documents: [],
    status: 'tasima_devam_ediyor',
    isActive: true,
    kar,
    karYuzde,
    elleclemeFaturasi: data.elleclemeFaturasi,
    hammaliyeFaturasi: data.hammaliyeFaturasi,
    createdAt: now,
    updatedAt: now,
    createdBy: currentUser.uid
  } as Operation;
};

// ===== DOSYA İŞLEMLERİ =====

export const uploadFile = async (
  file: File, 
  path: string,
  operationId: string,
  documentType: string
): Promise<string> => {
  const fileName = `${Date.now()}_${file.name}`;
  const storageRef = ref(storage, `${path}/${operationId}/${documentType}/${fileName}`);
  
  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);
  
  return downloadURL;
};

// Yükleme ilerleme bilgisi için: resumable upload
export const uploadFileResumable = async (
  file: File,
  path: string,
  operationId: string,
  documentType: string,
  onProgress?: (info: { percent: number; bytesTransferred: number; totalBytes: number }) => void
): Promise<string> => {
  const fileName = `${Date.now()}_${file.name}`;
  const storageRef = ref(storage, `${path}/${operationId}/${documentType}/${fileName}`);
  const task = uploadBytesResumable(storageRef, file);

  return await new Promise<string>((resolve, reject) => {
    task.on('state_changed',
      (snapshot) => {
        if (onProgress && snapshot.totalBytes > 0) {
          const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress({ percent, bytesTransferred: snapshot.bytesTransferred, totalBytes: snapshot.totalBytes });
        }
      },
      (error) => reject(error),
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve(url);
        } catch (e) {
          reject(e);
        }
      }
    );
  });
};

export const deleteFile = async (fileUrl: string): Promise<void> => {
  const fileRef = ref(storage, fileUrl);
  await deleteObject(fileRef);
};

// ===== DASHBOARD İSTATİSTİKLERİ =====

export const getDashboardStats = async () => {
  // Toplam nakliyeci sayısı
  const carriersSnapshot = await getDocs(collection(db, COLLECTIONS.CARRIERS));
  const totalCarriers = carriersSnapshot.size;
  
  // Aktif operasyon sayısı
  const activeOpsQuery = query(
    collection(db, COLLECTIONS.OPERATIONS),
    where('isActive', '==', true)
  );
  const activeOpsSnapshot = await getDocs(activeOpsQuery);
  const activeOperations = activeOpsSnapshot.size;
  
  // Tamamlanan operasyon sayısı
  const completedOpsQuery = query(
    collection(db, COLLECTIONS.OPERATIONS),
    where('isActive', '==', false)
  );
  const completedOpsSnapshot = await getDocs(completedOpsQuery);
  const completedOperations = completedOpsSnapshot.size;
  
  return {
    totalCarriers,
    activeOperations, 
    completedOperations
  };
};

// ===== MÜŞTERİ İŞLEMLERİ =====

export const createCustomer = async (form: CustomerFormData): Promise<Customer> => {
  const now = new Date();
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Kullanıcı oturumu bulunamadı');

  const data = {
    ...form,
    createdAt: toTimestamp(now),
    updatedAt: toTimestamp(now),
    createdBy: currentUser.uid
  };

  const refDoc = await addDoc(collection(db, COLLECTIONS.CUSTOMERS), data);

  return {
    id: refDoc.id,
    ...form,
    createdAt: now,
    updatedAt: now,
    createdBy: currentUser.uid
  } as Customer;
};

export const getAllCustomers = async (): Promise<Customer[]> => {
  const q = query(collection(db, COLLECTIONS.CUSTOMERS), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    return {
      id: d.id,
      firmaUnvani: String(data.firmaUnvani ?? ''),
      vergiDairesi: String(data.vergiDairesi ?? ''),
      vergiNumarasi: String(data.vergiNumarasi ?? ''),
      adres: String(data.adres ?? ''),
      il: String(data.il ?? ''),
      ilce: String(data.ilce ?? ''),
      yetkiliKisi: String(data.yetkiliKisi ?? ''),
      telefon: String(data.telefon ?? ''),
      eposta: String(data.eposta ?? ''),
      iban: String(data.iban ?? ''),
      createdAt: safeFromTimestamp(data.createdAt),
      updatedAt: safeFromTimestamp(data.updatedAt),
      createdBy: String(data.createdBy ?? '')
    } as Customer;
  });
};

export const updateCustomer = async (id: string, updates: Partial<CustomerFormData>): Promise<void> => {
  const refDoc = doc(db, COLLECTIONS.CUSTOMERS, id);
  const updated: Record<string, unknown> = {
    ...updates,
    updatedAt: toTimestamp(new Date())
  };
  await updateDoc(refDoc, updated);
};

export const deleteCustomer = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTIONS.CUSTOMERS, id));
};