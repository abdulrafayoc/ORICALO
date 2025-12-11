import React from 'react';
import { Building, MapPin, ArrowRight, BedDouble, Bath, Ruler, Tag } from 'lucide-react';

interface Property {
    id: string;
    title: string;
    location: string;
    price: string;
    image?: string;
    description?: string;
    type?: string;
    bedrooms?: number;
    baths?: number;
    area?: string;
    features?: string[] | string; // Handle both JSON list or string
}

interface RagWidgetProps {
    listings: Property[];
}

export default function RagWidget({ listings }: RagWidgetProps) {
    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-blue-400 font-semibold uppercase tracking-wider text-sm flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    Property Matches
                </h3>
                <span className="text-xs text-neutral-500">{listings.length} results found</span>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
                {listings.map((item) => (
                    <div
                        key={item.id}
                        className="min-w-[280px] w-[280px] bg-black border border-neutral-800 rounded-lg overflow-hidden group hover:border-neutral-700 transition-colors flex flex-col"
                    >
                        <div className="h-32 bg-neutral-800 relative overflow-hidden shrink-0">
                            {item.image ? (
                                <img src={item.image} alt={item.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-neutral-700 bg-neutral-900">
                                    <Building className="w-8 h-8 mb-1" />
                                    {item.type && <span className="text-xs uppercase tracking-widest">{item.type}</span>}
                                </div>
                            )}
                            <div className="absolute top-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded backdrop-blur-sm font-medium">
                                {item.price}
                            </div>
                        </div>

                        <div className="p-4 flex flex-col flex-1">
                            <h4 className="text-sm font-medium text-neutral-200 line-clamp-1 mb-1" title={item.title}>
                                {item.title}
                            </h4>
                            <div className="flex items-center gap-1 text-xs text-neutral-500 mb-3">
                                <MapPin className="w-3 h-3" />
                                <span className="line-clamp-1">{item.location}</span>
                            </div>

                            {/* Stats Row */}
                            <div className="flex items-center gap-3 mb-3 text-xs text-neutral-400">
                                {item.bedrooms != null && (
                                    <span className="flex items-center gap-1"><BedDouble className="w-3 h-3" /> {item.bedrooms}</span>
                                )}
                                {item.baths != null && (
                                    <span className="flex items-center gap-1"><Bath className="w-3 h-3" /> {item.baths}</span>
                                )}
                                {item.area && (
                                    <span className="flex items-center gap-1"><Ruler className="w-3 h-3" /> {item.area}</span>
                                )}
                            </div>

                            {/* Features */}
                            {item.features && (
                                <div className="flex flex-wrap gap-1 mb-4">
                                    {(Array.isArray(item.features)
                                        ? item.features
                                        : (typeof item.features === 'string' ? item.features.split(',').map(s => s.trim()) : [])
                                    )
                                        .slice(0, 2).map((feat, i) => (
                                            <span key={i} className="text-[10px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded border border-neutral-700">
                                                {feat}
                                            </span>
                                        ))}
                                    {(
                                        (Array.isArray(item.features) ? item.features.length : (typeof item.features === 'string' ? item.features.split(',').length : 0))
                                        > 2
                                    ) && (
                                            <span className="text-[10px] text-neutral-600">
                                                +{(Array.isArray(item.features) ? item.features.length : (typeof item.features === 'string' ? item.features.split(',').length : 0)) - 2} more
                                            </span>
                                        )}
                                </div>
                            )}

                            <div className="mt-auto">
                                <button className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded text-xs text-neutral-400 hover:text-white transition-colors flex items-center justify-center gap-1">
                                    View Details <ArrowRight className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
