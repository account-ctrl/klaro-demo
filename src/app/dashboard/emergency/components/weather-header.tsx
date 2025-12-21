'use client';

import { CloudRain, Sun, Wind, Thermometer, CloudLightning, CloudFog, Cloud } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export const WeatherHeader = () => {
    const [weather, setWeather] = useState({
        temp: 0,
        condition: 'Loading...',
        humidity: '--%',
        wind: '-- km/h',
        code: 0
    });

    useEffect(() => {
        const fetchWeather = async () => {
            try {
                // Using Open-Meteo API
                const response = await fetch(
                    'https://api.open-meteo.com/v1/forecast?latitude=14.6760&longitude=121.0437&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Asia%2FSingapore'
                );
                const data = await response.json();
                
                const getWeatherCondition = (code: number) => {
                    if (code === 0) return 'Clear';
                    if (code >= 1 && code <= 3) return 'Partly Cloudy';
                    if (code >= 45 && code <= 48) return 'Foggy';
                    if (code >= 51 && code <= 67) return 'Rainy';
                    if (code >= 80 && code <= 82) return 'Showers';
                    if (code >= 95) return 'Thunderstorm';
                    return 'Cloudy';
                };

                setWeather({
                    temp: Math.round(data.current.temperature_2m),
                    condition: getWeatherCondition(data.current.weather_code),
                    humidity: `${data.current.relative_humidity_2m}%`,
                    wind: `${Math.round(data.current.wind_speed_10m)} km/h`,
                    code: data.current.weather_code
                });
            } catch (error) {
                console.error("Failed to fetch weather:", error);
                setWeather({
                    temp: 30,
                    condition: 'Fair',
                    humidity: '70%',
                    wind: '10 km/h',
                    code: 0
                });
            }
        };

        fetchWeather();
        const interval = setInterval(fetchWeather, 30 * 60 * 1000); 
        return () => clearInterval(interval);
    }, []);

    const getIcon = (code: number) => {
        if (code >= 95) return <CloudLightning className="h-4 w-4 text-yellow-500" />;
        if (code >= 51) return <CloudRain className="h-4 w-4 text-blue-400" />;
        if (code >= 45) return <CloudFog className="h-4 w-4 text-zinc-400" />;
        if (code >= 1) return <Cloud className="h-4 w-4 text-zinc-300" />;
        return <Sun className="h-4 w-4 text-amber-500" />;
    };

    return (
        <div className="flex items-center gap-4 text-sm font-medium">
             <div className="flex items-center gap-2 bg-zinc-900/50 px-3 py-1.5 rounded-full border border-zinc-800/50">
                {getIcon(weather.code)}
                <span className="text-zinc-200">{weather.temp}°C</span>
             </div>
             
             <div className="hidden lg:flex items-center gap-4 text-xs text-zinc-500 font-mono">
                 <span className="uppercase text-zinc-400 hidden xl:block">{weather.condition}</span>
                 <span className="hidden xl:block text-zinc-700">•</span>
                 <div className="flex items-center gap-1">
                    <Wind className="h-3 w-3" />
                    {weather.wind}
                 </div>
                 <span className="text-zinc-700">•</span>
                 <div className="flex items-center gap-1">
                    <Thermometer className="h-3 w-3" />
                    {weather.humidity}
                 </div>
             </div>
        </div>
    );
};
