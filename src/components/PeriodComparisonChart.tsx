import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComparisonData {
  current: number;
  previous: number;
  label: string;
  format?: 'currency' | 'percentage' | 'number';
}

interface PeriodComparisonChartProps {
  title: string;
  data: ComparisonData[];
  periodLabel: {
    current: string;
    previous: string;
  };
}

export const PeriodComparisonChart = ({ title, data, periodLabel }: PeriodComparisonChartProps) => {
  const formatValue = (value: number, format?: string) => {
    switch (format) {
      case 'currency':
        return `€${value.toFixed(2)}`;
      case 'percentage':
        return `${value.toFixed(1)}%`;
      default:
        return value.toString();
    }
  };

  const getGrowthIndicator = (current: number, previous: number) => {
    if (previous === 0) return { growth: 0, isPositive: current >= 0 };
    const growth = ((current - previous) / previous) * 100;
    return { growth, isPositive: growth >= 0 };
  };

  const maxValue = Math.max(...data.flatMap(d => [d.current, d.previous]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          {title}
        </CardTitle>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-primary rounded-full"></div>
            <span>{periodLabel.current}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-muted rounded-full"></div>
            <span>{periodLabel.previous}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {data.map((item, index) => {
            const { growth, isPositive } = getGrowthIndicator(item.current, item.previous);
            const Icon = isPositive ? TrendingUp : TrendingDown;
            
            return (
              <div key={index} className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", isPositive ? "text-green-500" : "text-red-500")} />
                    <Badge variant={isPositive ? "default" : "destructive"} className="text-xs">
                      {growth !== 0 ? `${isPositive ? '+' : ''}${growth.toFixed(1)}%` : '0%'}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {/* Current Period Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-primary font-medium">{periodLabel.current}</span>
                      <span className="font-medium">{formatValue(item.current, item.format)}</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${maxValue > 0 ? (item.current / maxValue) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Previous Period Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{periodLabel.previous}</span>
                      <span className="text-muted-foreground">{formatValue(item.previous, item.format)}</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-muted-foreground rounded-full transition-all duration-500"
                        style={{ width: `${maxValue > 0 ? (item.previous / maxValue) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};