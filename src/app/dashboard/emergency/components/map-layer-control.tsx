'use client';

import { Button } from "@/components/ui/button";
import { Video, Droplets, Tent, Layers, Users, Accessibility, ChevronDown, ChevronUp, Baby, Heart, ShieldAlert, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Slider } from "@/components/ui/slider";

export interface LayerState {
    showCCTV: boolean;
    showHydrants: boolean;
    showEvac: boolean;
    demographicLayer: 'none' | 'seniors' | 'pwds' | '4ps' | 'all';
    hazardLayerOpacity: number;
    showFloodMap: boolean;
}

interface LayerControlProps {
    layers: LayerState;
    toggleLayer: (key: keyof LayerState, value?: any) => void;
    className?: string; 
}

export function MapLayerControl({ layers, toggleLayer, className }: LayerControlProps) {
    return (
        <div className={cn("flex flex-col gap-2 pointer-events-auto", className)}>
            <div className="bg-zinc-950/90 backdrop-blur border border-zinc-800 rounded-md p-2 shadow-xl w-60 space-y-2">
                
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

                {/* MODULE 1.3: STATIC GIS HAZARD LAYERS */}
                <CollapsibleSection title="Hazard Maps" icon={<ShieldAlert className="w-3 h-3" />}>
                    <LayerToggle 
                        active={layers.showFloodMap} 
                        onClick={() => toggleLayer('showFloodMap')} 
                        icon={<Droplets className="w-3 h-3" />}
                        label="100-Yr Flood Plain"
                        colorIndicator="bg-blue-500"
                    />
                    <div className="px-2 py-3 space-y-2">
                        <div className="flex justify-between items-center text-[8px] font-black uppercase text-zinc-500 tracking-widest">
                            <span>Layer Opacity</span>
                            <span className="text-zinc-300">{layers.hazardLayerOpacity}%</span>
                        </div>
                        <Slider 
                            value={[layers.hazardLayerOpacity]} 
                            onValueChange={(v) => toggleLayer('hazardLayerOpacity', v[0])}
                            max={100}
                            step={5}
                            className="h-4"
                        />
                    </div>
                </CollapsibleSection>

                <CollapsibleSection title="Demographics" icon={<Users className="w-3 h-3" />}>
                    <LayerToggle 
                        active={layers.demographicLayer === 'seniors'} 
                        onClick={() => toggleLayer('demographicLayer', layers.demographicLayer === 'seniors' ? 'none' : 'seniors')} 
                        icon={<Heart className="w-3 h-3" />}
                        label="Senior Citizens"
                        colorIndicator="bg-purple-500"
                    />
                    <LayerToggle 
                        active={layers.demographicLayer === 'pwds'} 
                        onClick={() => toggleLayer('demographicLayer', layers.demographicLayer === 'pwds' ? 'none' : 'pwds')} 
                        icon={<Accessibility className="w-3 h-3" />}
                        label="Persons with Disability"
                        colorIndicator="bg-cyan-500"
                    />
                    <LayerToggle 
                        active={layers.demographicLayer === '4ps'} 
                        onClick={() => toggleLayer('demographicLayer', layers.demographicLayer === '4ps' ? 'none' : '4ps')} 
                        icon={<Users className="w-3 h-3" />}
                        label="4Ps Beneficiaries"
                        colorIndicator="bg-orange-500"
                    />
                    <div className="h-px bg-zinc-800 my-1 mx-2" />
                    <LayerToggle 
                        active={layers.demographicLayer === 'all'} 
                        onClick={() => toggleLayer('demographicLayer', layers.demographicLayer === 'all' ? 'none' : 'all')} 
                        icon={<Layers className="w-3 h-3" />}
                        label="View All Households"
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
                <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-2 uppercase tracking-wider font-black">
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
                "w-full justify-between h-8 text-[11px] px-2 hover:bg-zinc-800 transition-all font-bold",
                active ? "bg-zinc-800 text-zinc-100 ring-1 ring-zinc-700 shadow-inner" : "text-zinc-400"
            )}
        >
            <div className="flex items-center gap-2">
                <span className={cn(active ? "text-inherit" : "text-zinc-500")}>{icon}</span>
                {label}
            </div>
            {colorIndicator && (
                <div className={cn("w-1.5 h-1.5 rounded-full", active ? colorIndicator : "bg-zinc-700")} />
            )}
        </Button>
    )
}
