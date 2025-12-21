'use client';

import { Button } from "@/components/ui/button";
import { Video, Droplets, Tent, Layers, Users, Accessibility, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export interface LayerState {
    showCCTV: boolean;
    showHydrants: boolean;
    showEvac: boolean;
    demographicLayer: 'none' | 'vulnerable' | 'all';
}

interface LayerControlProps {
    layers: LayerState;
    toggleLayer: (key: keyof LayerState, value?: any) => void;
}

export function MapLayerControl({ layers, toggleLayer }: LayerControlProps) {
    return (
        <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2 pointer-events-auto">
            <div className="bg-zinc-950/90 backdrop-blur border border-zinc-800 rounded-md p-2 shadow-xl w-56 space-y-2">
                
                <CollapsibleSection title="Infrastructure" icon={<Layers className="w-3 h-3" />}>
                    <LayerToggle 
                        active={layers.showCCTV} 
                        onClick={() => toggleLayer('showCCTV')} 
                        icon={<Video className="w-3 h-3" />}
                        label="CCTV Feeds"
                    />
                    <LayerToggle 
                        active={layers.showHydrants} 
                        onClick={() => toggleLayer('showHydrants')} 
                        icon={<Droplets className="w-3 h-3" />}
                        label="Fire Hydrants"
                    />
                    <LayerToggle 
                        active={layers.showEvac} 
                        onClick={() => toggleLayer('showEvac')} 
                        icon={<Tent className="w-3 h-3" />}
                        label="Evac Centers"
                    />
                </CollapsibleSection>

                <CollapsibleSection title="Demographics" icon={<Users className="w-3 h-3" />}>
                    <LayerToggle 
                        active={layers.demographicLayer === 'vulnerable'} 
                        onClick={() => toggleLayer('demographicLayer', layers.demographicLayer === 'vulnerable' ? 'none' : 'vulnerable')} 
                        icon={<Accessibility className="w-3 h-3" />}
                        label="Vulnerable (Priority)"
                        colorIndicator="bg-purple-500"
                    />
                    <LayerToggle 
                        active={layers.demographicLayer === 'all'} 
                        onClick={() => toggleLayer('demographicLayer', layers.demographicLayer === 'all' ? 'none' : 'all')} 
                        icon={<Users className="w-3 h-3" />}
                        label="All Households"
                        colorIndicator="bg-zinc-500"
                    />
                </CollapsibleSection>

            </div>
        </div>
    );
}

function CollapsibleSection({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(true);
    return (
        <div className="border border-zinc-800/50 rounded bg-zinc-900/30 overflow-hidden">
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className="w-full flex items-center justify-between p-2 bg-zinc-900/50 hover:bg-zinc-800/50 transition-colors"
            >
                <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-2 uppercase tracking-wider font-semibold">
                    {icon} {title}
                </div>
                {isOpen ? <ChevronUp className="w-3 h-3 text-zinc-500" /> : <ChevronDown className="w-3 h-3 text-zinc-500" />}
            </button>
            {isOpen && <div className="p-1 space-y-1 border-t border-zinc-800/50">{children}</div>}
        </div>
    );
}

function LayerToggle({ active, onClick, icon, label, colorIndicator }: any) {
    return (
        <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClick}
            className={cn(
                "w-full justify-between h-7 text-xs px-2 hover:bg-zinc-800",
                active ? "bg-zinc-800 text-zinc-100" : "text-zinc-400"
            )}
        >
            <div className="flex items-center gap-2">
                {icon}
                {label}
            </div>
            {colorIndicator && (
                <div className={cn("w-1.5 h-1.5 rounded-full", active ? colorIndicator : "bg-zinc-700")} />
            )}
        </Button>
    )
}
