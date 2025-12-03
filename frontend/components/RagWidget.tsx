import React from 'react';
import { Building, MapPin, ArrowRight } from 'lucide-react';

interface Property {
    id: string;
    title: string;
    location: string;
    price: string;
    image?: string;
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
                        className="min-w-[240px] w-[240px] bg-black border border-neutral-800 rounded-lg overflow-hidden group hover:border-neutral-700 transition-colors"
                    >
                        <div className="h-32 bg-neutral-800 relative overflow-hidden">
                            {item.image ? (
                                <img src={item.image} alt={item.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-neutral-700">
                                    <Building className="w-8 h-8" />
                                </div>
                            )}
                            <div className="absolute top-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                                {item.price}
                            </div>
                        </div>

                        <div className="p-3">
                            <h4 className="text-sm font-medium text-neutral-200 line-clamp-1 mb-1" title={item.title}>
                                {item.title}
                            </h4>
                            <div className="flex items-center gap-1 text-xs text-neutral-500 mb-3">
                                <MapPin className="w-3 h-3" />
                                <span className="line-clamp-1">{item.location}</span>
                            </div>

                            <button className="w-full py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded text-xs text-neutral-400 hover:text-white transition-colors flex items-center justify-center gap-1">
                                View Details <ArrowRight className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
