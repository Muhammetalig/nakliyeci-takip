'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { useAuth } from '../../../../lib/contexts/AuthContext';
import { createCarrier } from '../../../../lib/firebase-service';
import toast from 'react-hot-toast';

const AddCarrierPage: React.FC = () => {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form setup
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<{
    firmaAdi: string;
    adres: string;
    telefon: string;
    iban: string;
    vehicles: Array<{ plaka: string; aracTipi: string; }>;
  }>({
    defaultValues: {
      firmaAdi: '',
      adres: '',
      telefon: '',
      iban: '',
      vehicles: [{ plaka: '', aracTipi: 'Kamyon' }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'vehicles'
  });

  // Kullanıcı yoksa login sayfasına yönlendir
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  // Form submit
  type FormValues = {
    firmaAdi: string;
    adres: string;
    telefon: string;
    iban: string;
    vehicles: Array<{ plaka?: string; aracTipi?: string }>;
  };

  const onSubmit = async (data: FormValues) => {
    if (!user) return;

    setIsSubmitting(true);

    try {
      const carrierData = {
        firmaAdi: data.firmaAdi || 'Belirtilmemiş',
        adres: data.adres || 'Belirtilmemiş',
        telefon: data.telefon || 'Belirtilmemiş',
        iban: data.iban || 'Belirtilmemiş',
        vehicles: data.vehicles?.map((vehicle, index: number) => ({
          id: `vehicle_${Date.now()}_${index}`,
          plaka: vehicle.plaka || `PLAKA${index + 1}`,
          aracTipi: vehicle.aracTipi || 'Kamyon'
        })) || [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: user.id
      };

      await createCarrier(carrierData);
      toast.success('Nakliyeci başarıyla eklendi!');
      router.push('/dashboard/carriers');
    } catch (error: unknown) {
      console.error('Nakliyeci eklenirken hata:', error);
      const message = error instanceof Error ? error.message : String(error);
      toast.error('Nakliyeci eklenirken hata oluştu: ' + (message || 'Bilinmeyen hata'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Yeni Nakliyeci Ekle</h1>
              <p className="mt-1 text-sm text-gray-600">
                Nakliyeci firma bilgilerini ve araçlarını kaydedin
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard/carriers')}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← Geri Dön
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Firma Bilgileri */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Firma Bilgileri</h2>
            </div>
            <div className="px-6 py-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Firma Adı */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Firma Adı
                  </label>
                  <input
                    type="text"
                    {...register('firmaAdi')}
                    className="input"
                    placeholder="Nakliye Firması A.Ş."
                  />
                </div>

                {/* Telefon */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    {...register('telefon')}
                    className="input"
                    placeholder="0555 123 45 67"
                  />
                </div>
              </div>

              {/* Adres */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adres
                </label>
                <textarea
                  {...register('adres')}
                  rows={3}
                  className="input"
                  placeholder="İş adresi detayları..."
                />
              </div>

              {/* IBAN */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IBAN
                </label>
                <input
                  type="text"
                  {...register('iban')}
                  className="input font-mono"
                  placeholder="TR01 2345 6789 0123 4567 8901 23"
                />
              </div>
            </div>
          </div>

          {/* Araç Bilgileri */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">Araç Bilgileri</h2>
                <button
                  type="button"
                  onClick={() => append({ plaka: '', aracTipi: 'Kamyon' })}
                  className="btn btn-primary text-sm"
                >
                  + Araç Ekle
                </button>
              </div>
            </div>
            <div className="px-6 py-4 space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-sm font-medium text-gray-900">Araç {index + 1}</h3>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Kaldır
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Plaka */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Plaka
                      </label>
                      <input
                        type="text"
                        {...register(`vehicles.${index}.plaka`)}
                        className="input"
                        placeholder="34ABC1234"
                        style={{ textTransform: 'uppercase' }}
                      />
                    </div>

                    {/* Araç Tipi */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Araç Tipi
                      </label>
                      <select
                        {...register(`vehicles.${index}.aracTipi`)}
                        className="input"
                      >
                        <option value="Tır">Tır</option>
                        <option value="Kamyon">Kamyon</option>
                        <option value="Kamyonet">Kamyonet</option>
                        <option value="Çekici">Çekici</option>
                        <option value="Dorse">Dorse</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.push('/dashboard/carriers')}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              İptal
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Kaydediliyor...
                </div>
              ) : (
                'Nakliyeciyi Kaydet'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCarrierPage;