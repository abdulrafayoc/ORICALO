import React from "react";
import { Building, MapPin, ArrowRight, BedDouble, Bath, Ruler } from "lucide-react";
import { motion } from "framer-motion";
import type { Property } from "@/lib/types";
import { Card, CardBody } from "./ui/card";
import { fadeUp } from "@/lib/motion";

interface RagWidgetProps {
  listings: Property[];
}

function parseFeatures(features: string[] | string | undefined): string[] {
  if (!features) return [];
  if (Array.isArray(features)) return features;
  return typeof features === "string"
    ? features.split(",").map((s) => s.trim())
    : [];
}

export default function RagWidget({ listings }: RagWidgetProps) {
  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible">
      <Card>
        <CardBody className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.15em] text-accent flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5" />
              Property matches
            </h3>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              {listings.length} results
            </span>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2">
            {listings.map((item) => {
              const feats = parseFeatures(item.features);
              return (
                <div
                  key={item.id}
                  className="min-w-[260px] w-[260px] bg-popover border border-border rounded-md overflow-hidden hover:border-accent/40 transition-colors flex flex-col"
                >
                  <div className="h-28 bg-muted relative overflow-hidden shrink-0">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-muted">
                        <Building className="w-6 h-6 mb-1 opacity-50" />
                        {item.type && (
                          <span className="font-mono text-[10px] uppercase tracking-[0.15em]">
                            {item.type}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-background/85 text-foreground font-serif text-sm px-2 py-0.5 rounded-sm border border-border">
                      {item.price}
                    </div>
                  </div>

                  <div className="p-3.5 flex flex-col flex-1">
                    <h4
                      className="text-sm text-foreground line-clamp-1 mb-1.5"
                      title={item.title}
                    >
                      {item.title}
                    </h4>
                    <div className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground mb-3">
                      <MapPin className="w-3 h-3" />
                      <span className="line-clamp-1">{item.location}</span>
                    </div>

                    <div className="flex items-center gap-3 mb-3 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                      {item.bedrooms != null && (
                        <span className="flex items-center gap-1">
                          <BedDouble className="w-3 h-3" /> {item.bedrooms}
                        </span>
                      )}
                      {item.baths != null && (
                        <span className="flex items-center gap-1">
                          <Bath className="w-3 h-3" /> {item.baths}
                        </span>
                      )}
                      {item.area && (
                        <span className="flex items-center gap-1">
                          <Ruler className="w-3 h-3" /> {item.area}
                        </span>
                      )}
                    </div>

                    {feats.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {feats.slice(0, 2).map((feat, i) => (
                          <span
                            key={i}
                            className="font-mono text-[9px] uppercase tracking-[0.08em] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-sm border border-border"
                          >
                            {feat}
                          </span>
                        ))}
                        {feats.length > 2 && (
                          <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">
                            +{feats.length - 2} more
                          </span>
                        )}
                      </div>
                    )}

                    <div className="mt-auto">
                      <button className="w-full py-1.5 bg-transparent border border-border rounded-sm font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground hover:text-accent hover:border-accent/40 transition-colors flex items-center justify-center gap-1">
                        View details <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>
    </motion.div>
  );
}
