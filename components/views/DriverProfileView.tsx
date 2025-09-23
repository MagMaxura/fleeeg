
import React, { useContext, useMemo } from 'react';
import { AppContext } from '../../AppContext.ts';
import { Card, Spinner, StarRating, Icon, Button } from '../ui.tsx';
import type { Driver, Review } from '../../src/types.ts';

const DriverProfileView: React.FC = () => {
  const context = useContext(AppContext);

  const driver = useMemo(() => {
    if (!context?.activeDriverId || !context.users) return null;
    return context.users.find(u => u.id === context.activeDriverId) as Driver | undefined;
  }, [context?.activeDriverId, context?.users]);

  const driverReviews = useMemo(() => {
    if (!context?.activeDriverId || !context.reviews) return [];
    return context.reviews.filter(r => r.driver_id === context.activeDriverId);
  }, [context?.activeDriverId, context?.reviews]);

  const stats = useMemo(() => {
    if (!driverReviews) return { averageRating: 0, reviewCount: 0 };
    const reviewCount = driverReviews.length;
    const totalRating = driverReviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = reviewCount > 0 ? totalRating / reviewCount : 0;
    return { averageRating, reviewCount };
  }, [driverReviews]);

  if (!context) return <div className="p-8 text-center flex justify-center"><Spinner /></div>;

  if (!driver) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Fletero no encontrado</h2>
        <Button onClick={() => context.setView('rankings')}>Volver al Ranking</Button>
      </div>
    );
  }

  const getReviewerName = (reviewerId: string) => {
    const reviewer = context.users.find(u => u.id === reviewerId);
    return reviewer ? reviewer.full_name : 'Cliente Anónimo';
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <button onClick={() => context.setView('rankings')} className="flex items-center gap-2 text-slate-300 hover:text-white transition mb-6 font-semibold staggered-child">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
        Volver al Ranking
      </button>

      {/* Driver Header Card */}
      <div className="staggered-child" style={{ animationDelay: '0.1s' }}>
        <Card className="mb-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <img src={driver.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(driver.full_name)}&background=0f172a&color=fff&size=200`} alt={driver.full_name} className="w-32 h-32 rounded-full object-cover border-4 border-slate-700" />
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-4xl font-bold text-slate-100">{driver.full_name}</h2>
              <div className="flex items-center gap-3 mt-3 justify-center md:justify-start">
                <StarRating value={stats.averageRating} isEditable={false} size="md" />
                <span className="text-xl font-bold text-slate-200">{stats.averageRating.toFixed(1)}</span>
                <span className="text-slate-400">({stats.reviewCount} {stats.reviewCount === 1 ? 'reseña' : 'reseñas'})</span>
              </div>
               <p className="text-md text-slate-400 mt-2">{driver.address}, {driver.city}, {driver.province}</p>
            </div>
            {driver.vehicle_photo_url && (
                <div className="text-center">
                    <img src={driver.vehicle_photo_url} alt={driver.vehicle || 'Vehículo'} className="w-40 h-auto rounded-lg object-cover border-2 border-slate-700" />
                    <p className="text-lg text-slate-300 mt-2 font-semibold">{driver.vehicle} ({driver.vehicle_type})</p>
                </div>
            )}
          </div>
        </Card>
      </div>

      {/* Reviews Section */}
      <h3 className="text-3xl font-bold mb-6 text-slate-100 staggered-child" style={{ animationDelay: '0.2s' }}>Reseñas de Clientes</h3>
      <div className="space-y-6">
        {driverReviews.length > 0 ? (
          driverReviews.map((review, index) => (
            <div key={review.id} className="staggered-child" style={{ animationDelay: `${0.3 + index * 0.05}s` }}>
              <Card className="bg-slate-900/40">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="font-bold text-slate-100 text-lg">{getReviewerName(review.reviewer_id)}</p>
                         <p className="text-xs text-slate-500 mb-2">{new Date(review.created_at).toLocaleDateString()}</p>
                    </div>
                    <StarRating value={review.rating} size="sm" />
                </div>
                <blockquote className="mt-2 text-slate-300 italic border-l-4 border-slate-700 pl-4">
                  "{review.comment || 'Sin comentario.'}"
                </blockquote>
              </Card>
            </div>
          ))
        ) : (
          <div className="staggered-child" style={{ animationDelay: '0.3s' }}>
            <Card>
              <p className="text-center text-slate-400">Este fletero aún no tiene reseñas.</p>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverProfileView;