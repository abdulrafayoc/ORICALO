import React from 'react';
import { TrendingUp, AlertCircle } from 'lucide-react';

interface PriceWidgetProps {
    minPrice: number;
    maxPrice: number;
    currency?: string;
    confidence: number;
}

export default function PriceWidget({ minPrice, maxPrice, currency = "PKR", confidence }: PriceWidgetProps) {
    // Helper to format large numbers (Lakh/Crore)
    const formatPrice = (val: number) => {
        if (val >= 10000000) {
            return `${(val / 10000000).toFixed(2)} Cr`;
        }
        if (val >= 100000) {
            return `${(val / 100000).toFixed(2)} Lakh`;
        }
        return val.toLocaleString();
    };

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-emerald-400 font-semibold uppercase tracking-wider text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Valuation Estimate
                </h3>
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <span>Confidence:</span>
                    <div className="w-16 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full ${confidence > 0.7 ? 'bg-emerald-500' : 'bg-yellow-500'}`}
                            style={{ width: `${confidence * 100}%` }}
                        />
                    </div>
                </div>
            </div>

            <div className="text-center py-4">
                <div className="text-4xl font-bold text-white mb-1">
                    {formatPrice(minPrice)} - {formatPrice(maxPrice)}
                </div>
                <div className="text-neutral-500 text-sm">
                    Estimated Market Value ({currency})
                </div>
            </div>

            <div className="mt-4 p-3 bg-neutral-800/50 rounded-lg flex items-start gap-3 border border-neutral-800">
                <AlertCircle className="w-4 h-4 text-neutral-400 mt-0.5 shrink-0" />
                <p className="text-xs text-neutral-400 leading-relaxed">
                    This estimate is based on current market listings in similar localities.
                    Actual transaction prices may vary by 5-10%.
                </p>
            </div>
        </div>
    );
}
