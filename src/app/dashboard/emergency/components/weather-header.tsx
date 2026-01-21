'use client';

import { CloudRain, Sun, Wind, Thermometer, CloudLightning, CloudFog, Cloud, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useFirestore, useDoc } from "@/firebase";
import { doc } from "firebase/firestore";
import { cn } from "@/lib/utils";

export const WeatherHeader = () => {
    const firestore = useFirestore();
    
    // MODULE 1.1: SERVER-SIDE WEATHER INTEGRATION
    // Listening to the document updated by the Cloud Function
    const { data: weather, isLoading } = useDoc<any>(
        firestore ? doc(firestore, "system_integrations", "weather_current") : null
    );

    const getIcon = (condition?: string) => {
        const cond = condition?.toLowerCase() || '';
        if (cond.includes('thunder') || cond.includes('lightning')) return <CloudLightning className="h-4 w-4 text-yellow-500" />;
        if (cond.includes('rain') || cond.includes('shower')) return <CloudRain className="h-4 w-4 text-blue-400" />;
        if (cond.includes('fog') || cond.includes('mist')) return <CloudFog className="h-4 w-4 text-zinc-400" />;
        if (cond.includes('cloud')) return <Cloud className="h-4 w-4 text-zinc-300" />;
        return <Sun className="h-4 w-4 text-amber-500" />;
    };

    if (isLoading || !weather) {
        return (
            <div className="flex items-center gap-3 text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
                <Loader2 className="h-3 w-3 animate-spin" />
                Syncing weather...
            </div>
        );
    }

    return (
        <div className="flex items-center gap-4 text-sm font-medium animate-in fade-in duration-700">
             <div className="flex items-center gap-2 bg-zinc-900/50 px-3 py-1.5 rounded-full border border-zinc-800/50 shadow-inner">
                {getIcon(weather.condition)}
                <span className="text-zinc-200 font-bold">{Math.round(weather.temp)}°C</span>
             </div>
             
             <div className="hidden lg:flex items-center gap-4 text-[10px] text-zinc-500 font-mono tracking-tighter">
                 <span className="uppercase text-zinc-400 font-black hidden xl:block">{weather.condition}</span>
                 <span className="hidden xl:block text-zinc-800">|</span>
                 <div className="flex items-center gap-1">
                    <Wind className="h-3 w-3 text-zinc-600" />
                    <span className="font-bold">{weather.wind_speed} <span className="text-[8px] opacity-60">m/s</span></span>
                 </div>
                 <span className="text-zinc-800">|</span>
                 <div className="flex items-center gap-1">
                    <Thermometer className="h-3 w-3 text-zinc-600" />
                    <span className="font-bold">{weather.humidity}<span className="text-[8px] opacity-60">%</span></span>
                 </div>
                 <span className="hidden xl:block text-zinc-800">|</span>
                 <span className="hidden xl:block text-[8px] text-zinc-600 font-bold uppercase tracking-widest">
                    Live Feed: {weather.station_name}
                 </span>
             </div>
        </div>
    );
};
