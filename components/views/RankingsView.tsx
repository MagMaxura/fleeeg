


import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../../AppContext';
// FIX: Changed the import for 'SortKey' to a type-only import to align with the change from enum to type.
// This ensures that this file only has a type-level dependency on `types.ts`, which is crucial for preventing module resolution errors.
// Corrected path to point to the consolidated types file in src/.
// FIX: Added .ts extension to ensure proper module resolution, which is critical for Supabase client typing.
// FIX: Updated import for `SortKey`, which was moved to AppContext.ts to break a circular dependency.
import type { SortKey } from '../../AppContext';
import type { TripStatus, UserRole, Driver } from '../../src/types.ts';
import { Card, StarRating } from '../ui';

// FIX: Defined a constant object for SortKey values locally.
// Since the `SortKey` enum was removed from `types.ts` to make it a pure type file,
// this object provides the runtime values needed for component logic (state, sorting, etc.).
const SortKeyValues = {
  TRIPS: 'trips',
  KILOGRAMS: 'kilograms',
  VOLUME: 'volume',
  KILOMETERS: 'kilometers',
  RATING: 'rating',
} as const;

const RankingsView: React.FC = () => {
  const context = useContext(AppContext);
  // FIX: Updated component state to use the local SortKeyValues constant for its initial value.
  const [sortKey, setSortKey] = useState<SortKey>(SortKeyValues.TRIPS);

  const rankedDrivers = useMemo(() => {
    if (!context || !context.users || !context.reviews) return [];

    const drivers = context.users.filter(u => u.role === 'driver') as Driver[];

    const driverStats = drivers.map(driver => {
      const completedTrips = context.trips.filter(
        trip => trip.driver_id === driver.id && (trip.status === 'completed' || trip.status === 'paid')
      );
      
      const driverReviews = context.reviews.filter(review => review.driver_id === driver.id);
      const totalRating = driverReviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = driverReviews.length > 0 ? totalRating / driverReviews.length : 0;

      const totalTrips = completedTrips.length;
      const totalKms = completedTrips.reduce((sum, trip) => sum + (trip.distance_km || 0), 0);
      const totalKgs = completedTrips.reduce((sum, trip) => sum + trip.estimated_weight_kg, 0);
      const totalM3s = completedTrips.reduce((sum, trip) => sum + trip.estimated_volume_m3, 0);

      return { ...driver, totalTrips, totalKms, totalKgs, totalM3s, averageRating, reviewCount: driverReviews.length };
    });

    // FIX: Updated the sort logic to use the `SortKeyValues` constant instead of the old enum.
    return driverStats.sort((a, b) => {
      switch (sortKey) {
        case SortKeyValues.RATING:
          if (b.averageRating !== a.averageRating) {
            return b.averageRating - a.averageRating;
          }
          return b.reviewCount - a.reviewCount; // Secondary sort by number of reviews
        case SortKeyValues.KILOGRAMS: return b.totalKgs - a.totalKgs;
        case SortKeyValues.VOLUME: return b.totalM3s - a.totalM3s;
        case SortKeyValues.KILOMETERS: return b.totalKms - a.totalKms;
        case SortKeyValues.TRIPS:
        default:
          return b.totalTrips - a.totalTrips;
      }
    });
  }, [context, sortKey]);
  
  const handleViewProfile = (driverId: string) => {
    context?.viewDriverProfile(driverId);
  }

  const SortButton: React.FC<{ aSortKey: SortKey, children: React.ReactNode }> = ({ aSortKey, children }) => (
      <button 
        onClick={() => setSortKey(aSortKey)} 
        className={`relative py-2 px-4 rounded-lg transition-all duration-300 text-sm sm:text-base font-semibold outline-none focus-visible:ring-2 ring-amber-500 ring-offset-2 ring-offset-slate-900 ${sortKey === aSortKey ? 'text-slate-900' : 'text-slate-300 hover:text-white'}`}
      >
          {sortKey === aSortKey && <span className="absolute inset-0 fletapp-gold-gradient rounded-lg -z-10"></span>}
          {children}
      </button>
  );

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h2 className="text-4xl font-bold mb-2 text-slate-100 staggered-child" style={{animationDelay: '0.1s'}}>Ranking de Fleteros</h2>
      <p className="text-slate-400 mb-8 staggered-child" style={{animationDelay: '0.2s'}}>Los mejores fleteros de la plataforma, clasificados por su desempeño.</p>
      
      {/* FIX: Updated SortButton props to use the `SortKeyValues` constant. */}
      <div className="relative flex flex-wrap gap-2 mb-8 p-1.5 bg-slate-900/70 rounded-xl border border-slate-800 w-full sm:w-auto staggered-child" style={{animationDelay: '0.3s'}}>
        <SortButton aSortKey={SortKeyValues.TRIPS}>Por Viajes</SortButton>
        <SortButton aSortKey={SortKeyValues.RATING}>Mejores Calificados</SortButton>
        <SortButton aSortKey={SortKeyValues.KILOGRAMS}>Por Kg Totales</SortButton>
        <SortButton aSortKey={SortKeyValues.VOLUME}>Por m³ Totales</SortButton>
        <SortButton aSortKey={SortKeyValues.KILOMETERS}>Por Km Recorridos</SortButton>
      </div>

      <div className="space-y-4">
        {rankedDrivers.map((driver, index) => (
          <div key={driver.id} className="staggered-child" style={{animationDelay: `${0.4 + index * 0.05}s`}}>
            <Card 
              onClick={() => handleViewProfile(driver.id)}
              className={`transition-all duration-300 cursor-pointer ${index < 3 ? 'border-amber-600/60' : ''}`}
            >
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <span className={`text-3xl font-bold w-12 text-center ${index < 3 ? 'fletapp-text-gradient bg-clip-text text-transparent' : 'text-slate-500'}`}>#{index + 1}</span>
                  <img src={driver.photo_url} alt={driver.full_name} className="w-16 h-16 rounded-full object-cover border-2 border-slate-700"/>
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-xl font-bold text-slate-100">{driver.full_name}</h3>
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                     <StarRating value={driver.averageRating} isEditable={false} size="sm" />
                     <span className="text-sm text-slate-400">({driver.reviewCount} {driver.reviewCount === 1 ? 'reseña' : 'reseñas'})</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-center sm:text-right w-full sm:w-auto mt-4 sm:mt-0">
                  <div className="text-sm p-2 rounded-lg bg-slate-800/50">
                    <p className="font-bold text-lg text-white">{driver.totalTrips}</p>
                    <p className="text-slate-400">Viajes</p>
                  </div>
                  <div className="text-sm p-2 rounded-lg bg-slate-800/50">
                    <p className="font-bold text-lg text-white">{driver.totalKgs.toLocaleString()}</p>
                    <p className="text-slate-400">Kg</p>
                  </div>
                  <div className="text-sm p-2 rounded-lg bg-slate-800/50">
                    <p className="font-bold text-lg text-white">{driver.totalM3s.toLocaleString()}</p>
                    <p className="text-slate-400">m³</p>
                  </div>
                  <div className="text-sm p-2 rounded-lg bg-slate-800/50">
                    <p className="font-bold text-lg text-white">{driver.totalKms.toFixed(0)}</p>
                    <p className="text-slate-400">Km</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RankingsView;