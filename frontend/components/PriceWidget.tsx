import React from "react";
import { TrendingUp, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardBody } from "./ui/card";
import { Ticker } from "./Ticker";
import { fadeUp } from "@/lib/motion";

interface PriceWidgetProps {
  minPrice: number;
  maxPrice: number;
  currency?: string;
  confidence: number;
}

export default function PriceWidget({
  minPrice,
  maxPrice,
  currency = "PKR",
  confidence,
}: PriceWidgetProps) {
  const formatPrice = (val: number) => {
    if (val >= 10000000) return `${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `${(val / 100000).toFixed(2)} Lakh`;
    return val.toLocaleString();
  };

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible">
      <Card>
        <CardBody className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.15em] text-accent flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              Valuation estimate
            </h3>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                Confidence
              </span>
              <div className="w-14 h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className={
                    confidence > 0.7 ? "h-full bg-accent" : "h-full bg-yellow-500"
                  }
                  style={{ width: `${confidence * 100}%` }}
                />
              </div>
              <span className="font-mono text-[10px] text-foreground">
                {Math.round(confidence * 100)}%
              </span>
            </div>
          </div>

          <div className="text-center py-3">
            <div className="font-serif text-4xl text-foreground mb-1">
              {formatPrice(minPrice)} – {formatPrice(maxPrice)}
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Estimated market value · {currency}
            </div>
          </div>

          <div className="mt-4 p-3 bg-muted/40 border border-border rounded-sm flex items-start gap-2.5">
            <AlertCircle className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Based on current market listings in similar localities. Actual
              transaction prices may vary by 5–10%.
            </p>
          </div>
        </CardBody>
      </Card>
    </motion.div>
  );
}
