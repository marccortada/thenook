import { Badge } from '@/components/ui/badge';
import { usePromotions } from '@/hooks/usePromotions';

interface PriceDisplayProps {
  originalPrice: number;
  serviceId?: string;
  centerId?: string;
  className?: string;
  showPromotionBadge?: boolean;
}

const PriceDisplay = ({ 
  originalPrice, 
  serviceId, 
  centerId, 
  className = "",
  showPromotionBadge = true 
}: PriceDisplayProps) => {
  const { calculatePriceWithPromotions } = usePromotions();
  
  const priceInfo = calculatePriceWithPromotions(originalPrice, serviceId, centerId);
  const hasDiscount = priceInfo.discount > 0;
  
  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(cents / 100);
  };

  if (!hasDiscount) {
    return (
      <span className={`font-semibold ${className}`}>
        {formatPrice(originalPrice)}
      </span>
    );
  }

  const discountPercentage = Math.round((priceInfo.discount / originalPrice) * 100);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex flex-col items-start">
        <span className="text-sm text-muted-foreground line-through">
          {formatPrice(originalPrice)}
        </span>
        <span className="font-semibold text-lg text-primary">
          {formatPrice(priceInfo.finalPrice)}
        </span>
      </div>
      
      {showPromotionBadge && (
        <Badge variant="destructive" className="text-xs">
          -{discountPercentage}%
        </Badge>
      )}
      
      {priceInfo.appliedPromotions.length > 0 && showPromotionBadge && (
        <Badge variant="outline" className="text-xs">
          {priceInfo.appliedPromotions[0].name}
        </Badge>
      )}
    </div>
  );
};

export default PriceDisplay;