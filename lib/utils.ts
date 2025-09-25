import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Currency, OperationStatus } from './types';

// Tarih formatlama
export const formatDate = (date: Date, pattern: string = 'dd/MM/yyyy'): string => {
  if (!date || isNaN(date.getTime())) {
    return '-';
  }
  return format(date, pattern, { locale: tr });
};

// Para birimi formatlama
export const formatCurrency = (amount: number, currency: Currency = 'TRY'): string => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency
  }).format(amount);
};

// Operasyon durumu etiketleri
export const getStatusLabel = (status: OperationStatus): string => {
  const statusLabels = {
    'tasima_devam_ediyor': 'Taşıma Devam Ediyor',
    'tasima_tamamlandi': 'Taşıma Tamamlandı', 
    'nakliyeci_odeme_bekliyor': 'Nakliyeci Ödeme Bekliyor',
    'nakliyeci_odemesi_yapildi': 'Nakliyeci Ödemesi Yapıldı'
  };
  
  return statusLabels[status];
};

// Operasyon durumu rengi
export const getStatusColor = (status: OperationStatus): string => {
  const statusColors = {
    'tasima_devam_ediyor': '#3b82f6',      // mavi
    'tasima_tamamlandi': '#f59e0b',        // sarı
    'nakliyeci_odeme_bekliyor': '#ef4444', // kırmızı
    'nakliyeci_odemesi_yapildi': '#10b981'  // yeşil
  };
  
  return statusColors[status];
};

// Kar yüzdesi hesaplama
export const calculateProfit = (satis: number, maliyet: number) => {
  const kar = satis - maliyet;
  const karYuzde = maliyet > 0 ? (kar / maliyet) * 100 : 0;
  
  return {
    kar,
    karYuzde
  };
};

// Dosya boyutu formatlama
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Dosya uzantısı kontrolü
export const isValidFileType = (fileName: string, allowedTypes: string[] = ['pdf', 'jpg', 'jpeg', 'png']): boolean => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  return extension ? allowedTypes.includes(extension) : false;
};

// Vade hesaplama
export const calculateDueDate = (startDate: Date, daysToAdd: number): Date => {
  const result = new Date(startDate);
  result.setDate(result.getDate() + daysToAdd);
  return result;
};

// Vade durumu kontrolü
export const getPaymentStatus = (dueDate: Date) => {
  const today = new Date();
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return { status: 'overdue', daysLeft: Math.abs(diffDays), message: 'Gecikmiş' };
  } else if (diffDays <= 7) {
    return { status: 'due-soon', daysLeft: diffDays, message: 'Yakında' };
  } else {
    return { status: 'upcoming', daysLeft: diffDays, message: 'Yaklaşan' };
  }
};

// Toast mesaj tipleri
export const showToast = {
  success: (message: string) => {
    // react-hot-toast kullanılacak
  },
  error: (message: string) => {
    // react-hot-toast kullanılacak  
  },
  loading: (message: string) => {
    // react-hot-toast kullanılacak
  }
};

// Validation helpers
export const validateTCKN = (tckn: string): boolean => {
  // TC Kimlik No validasyonu
  if (!/^[1-9][0-9]{10}$/.test(tckn)) return false;
  
  const digits = tckn.split('').map(Number);
  const sum1 = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const sum2 = digits[1] + digits[3] + digits[5] + digits[7];
  const checksum1 = (sum1 * 7 - sum2) % 10;
  const checksum2 = (sum1 + sum2 + digits[9]) % 10;
  
  return checksum1 === digits[9] && checksum2 === digits[10];
};

export const validateIBAN = (iban: string): boolean => {
  // IBAN validasyonu - basit kontrol
  const cleanIban = iban.replace(/\s/g, '').toUpperCase();
  return /^TR[0-9]{26}$/.test(cleanIban);
};

export const validatePhone = (phone: string): boolean => {
  // Türkiye telefon numarası validasyonu
  const cleanPhone = phone.replace(/\D/g, '');
  return /^(90|0)?(5[0-9]{2}|[2-4][0-9]{2}|[8][0-9]{2})[0-9]{7}$/.test(cleanPhone);
};