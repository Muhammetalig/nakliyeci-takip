// Uygulama genelinde kullanılacak tip tanımlamaları

// Kullanıcı rolleri
export type UserRole = 'admin' | 'personel';

// Kullanıcı tipi
export interface User {
  id: string;
  email: string;
  displayName: string;
  phone?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

// Araç tipi
export interface Vehicle {
  id: string;
  plaka: string;
  aracTipi: string; // Tır, Kamyon, Kamyonet
}

// Nakliyeci tipi
export interface Carrier {
  id: string;
  firmaAdi: string;
  firmaTuru?: 'Sahis' | 'Limited' | 'Anonim';
  vergiDairesi?: string;
  vergiNumarasi?: string;
  adres: string;
  il?: string;
  ilce?: string;
  yetkiliKisi?: string;
  telefon: string;
  iban: string;
  email?: string; // Email adresi
  vehicles: Vehicle[]; // Firmanın araçları
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // Kaydı oluşturan kullanıcı ID
  isActive?: boolean;
}

// Nakliyeci oluşturma veri tipi
export interface CreateCarrierData {
  firmaAdi: string;
  firmaTuru?: 'Sahis' | 'Limited' | 'Anonim';
  vergiDairesi?: string;
  vergiNumarasi?: string;
  adres: string;
  il?: string;
  ilce?: string;
  yetkiliKisi?: string;
  telefon: string;
  iban: string;
  email?: string; // Email adresi
  plaka?: string; // Eski kullanım için geriye uyumlu
  vehicles?: Omit<Vehicle, 'id'>[]; // Çoklu araç girişi
  isActive?: boolean;
}

// Operasyon oluşturma veri tipi
export interface CreateOperationData {
  carrierId: string;
  operationDate?: Date;
  dueDate?: Date;
  amount?: number;
  currency?: Currency;
  waybillDocument?: File;
}

// Operasyon durumları
export type OperationStatus = 
  | 'tasima_devam_ediyor'    // Başlangıç durumu
  | 'tasima_tamamlandi'      // İmzalı irsaliye yüklenince
  | 'nakliyeci_odeme_bekliyor' // Fatura yüklenince
  | 'nakliyeci_odemesi_yapildi'; // Ödeme dekontu yüklenince (pasif)

// Para birimleri
export type Currency = 'TRY' | 'USD' | 'EUR';

// Taşıma tipi
export type TransportType = 'FTL' | 'LTL';

// Belge tipi
export type DocumentType = 
  | 'teslim_evraki'       // Teslim Evrakı
  | 'nakliyeci_faturasi'  // Nakliyeci Faturası  
  | 'musteri_faturasi'    // Müşteri Faturası
  | 'dekont'              // Ödeme Dekontu
  | 'ellecleme_belgesi'   // Elleçleme Belgesi (opsiyonel)
  | 'hammaliye_belgesi';  // Hammaliye Belgesi (opsiyonel)

// Belge tipi
export interface Document {
  id: string;
  type: DocumentType;
  evrakNo?: string; // Manuel girilen evrak no
  fileName: string;
  fileUrl: string;
  uploadedAt: Date;
  uploadedBy: string; // Yükleyen kullanıcı ID
  faturaTarihi?: Date; // Sadece fatura belgelerinde
}

// Operasyon tipi
export interface Operation {
  id: string;
  seferNo: string; // Sefer No - aynı zamanda operasyon adı
  tasimaTipi: TransportType;
  
  // Nakliyeci ve araç bilgileri
  carrierId: string; // Nakliyeci ID
  carrierName: string; // Nakliyeci firma adı
  vehicleId: string; // Araç ID
  vehiclePlaka: string; // Araç plakası
  vehicleType: string; // Araç tipi
  cekiciPlaka?: string;
  dorsePlaka?: string;
  
  // Tarih bilgileri
  yuklemetarihi: Date;
  bosaltmaTarihi: Date;
  siparisTarihi: Date;
  
  // Lokasyon bilgileri
  cikisNoktasi: string; // Çıkış ili
  varisNoktasi: string; // Varış ili
  yuklemeAdresi: string;
  varisAdresi: string;
  
  // Firma bilgileri
  musteriAdi: string;
  gondericifirma: string;
  aliciirma: string;
  tedarikciirma: string;
  
  // Sipariş ve belge numaraları
  siparisNo: string;
  irsaliyeNo: string;
  faturaNo: string;
  
  // Yük bilgileri
  adet: number;
  kg: number;
  desi: number;
  yukAgirligi: number; // kg
  malzemeBilgisi: string;
  malBedeli: number;
  
  // Finansal bilgiler
  toplamTutar: number;
  paraBirimi: Currency;
  vadeSuresi: number; // gün olarak
  aracMaliyeti: number; // Alış maliyeti
  navlunSatisTutari: number;
  kar: number; // otomatik hesaplama = satış - maliyet
  karYuzde: number; // kar yüzdesi
  // Hizmet faturaları (opsiyonel)
  elleclemeFaturasi?: boolean;
  hammaliyeFaturasi?: boolean;
  
  // Şoför bilgileri
  soforAdi: string;
  soforTelefonu: string;
  
  // Durum ve belgeler
  status: OperationStatus;
  documents: Document[];
  
  // Meta bilgiler
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // Kaydı oluşturan personel ID
  isActive: boolean; // Aktif/Pasif durumu
}

// Form validasyonu için tiplerr
export interface CarrierFormData {
  firmaAdi: string;
  adres: string;
  telefon: string;
  iban: string;
  vehicles: Omit<Vehicle, 'id'>[];
}

export type OperationFormData = Omit<Operation, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'documents' | 'status' | 'isActive' | 'kar' | 'karYuzde'>;

// Dashboard istatistikleri
export interface DashboardStats {
  totalCarriers: number;
  activeOperations: number;
  completedOperations: number;
  upcomingPayments: PaymentReminder[];
}

// Ödeme hatırlatıcısı
export interface PaymentReminder {
  operationId: string;
  seferNo: string;
  carrierName: string;
  dueDate: Date;
  amount: number;
  currency: Currency;
  daysLeft: number;
  isOverdue: boolean;
}

// Müşteri tipi
export interface Customer {
  id: string;
  firmaUnvani: string;
  vergiDairesi: string;
  vergiNumarasi: string;
  adres: string;
  il: string;
  ilce: string;
  yetkiliKisi: string;
  telefon: string;
  eposta: string;
  iban: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// Müşteri oluşturma/güncelleme form tipi
export interface CustomerFormData {
  firmaUnvani: string;
  vergiDairesi: string;
  vergiNumarasi: string;
  adres: string;
  il: string;
  ilce: string;
  yetkiliKisi: string;
  telefon: string;
  eposta: string;
  iban: string;
}