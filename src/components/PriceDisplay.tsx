import { Badge } from '@/components/ui/badge';
import { usePromotions } from '@/hooks/usePromotions';

interface PriceDisplayProps {
  originalPrice: number;
  serviceId?: string;
  centerId?: string;
  className?: string;
  showPromotionBadge?: boolean;
  serviceDiscount?: { has_discount: boolean; discount_price_cents: number };
}

const PriceDisplay = ({ 
  originalPrice, 
  serviceId, 
  centerId, 
  className = "",
  showPromotionBadge = true,
  serviceDiscount 
}: PriceDisplayProps) => {
  const { calculatePriceWithPromotions } = usePromotions();
  
  const priceInfo = calculatePriceWithPromotions(originalPrice, serviceId, centerId);
  
  // Aplicar descuento del servicio si existe
  let finalPrice = originalPrice;
  let discountAmount = 0;
  let discountSource = '';
  
  if (serviceDiscount?.has_discount && serviceDiscount.discount_price_cents > 0 && serviceDiscount.discount_price_cents < originalPrice) {
    finalPrice = serviceDiscount.discount_price_cents;
    discountAmount = originalPrice - serviceDiscount.discount_price_cents;
    discountSource = 'service';
  }
  
  // Si hay promociones, aplicar la mejor
  if (priceInfo.discount > discountAmount) {
    discountAmount = priceInfo.discount;
    finalPrice = priceInfo.finalPrice;
    discountSource = 'promotion';
  }
  
  const hasDiscount = discountAmount > 0;
  
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

  const discountPercentage = Math.round((discountAmount / originalPrice) * 100);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex flex-col items-start">
        <span className="text-sm text-muted-foreground line-through">
          {formatPrice(originalPrice)}
        </span>
        <span className="font-semibold text-lg text-primary">
          {formatPrice(finalPrice)}
        </span>
      </div>
      
      {showPromotionBadge && (
        <Badge variant="destructive" className="text-xs">
          -{discountPercentage}%
        </Badge>
      )}
      
      {discountSource === 'promotion' && priceInfo.appliedPromotions.length > 0 && showPromotionBadge && (
        <Badge variant="outline" className="text-xs">
          {priceInfo.appliedPromotions[0].name}
        </Badge>
      )}
      
      {discountSource === 'service' && showPromotionBadge && (
        <Badge variant="outline" className="text-xs">
          Descuento
        </Badge>
      )}
    </div>
  );
};

export default PriceDisplay;