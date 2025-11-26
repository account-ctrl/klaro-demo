
import { CloudRain, Sun, Wind, Thermometer } from "lucide-react";
import { useState, useEffect } from "react";

export const WeatherHeader = () => {
    const [weather, setWeather] = useState({
        temp: 0,
        condition: 'Loading...',
        humidity: '--%',
        wind: '-- km/h'
    });

    // Fetch real weather data
    useEffect(() => {
        const fetchWeather = async () => {
            try {
                // Using Open-Meteo API (Free, no key required) for Manila/Quezon City approx coords
                const response = await fetch(
                    'https://api.open-meteo.com/v1/forecast?latitude=14.6760&longitude=121.0437&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Asia%2FSingapore'
                );
                const data = await response.json();
                
                // Map WMO weather codes to text
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
                    wind: `${Math.round(data.current.wind_speed_10m)} km/h`
                });
            } catch (error) {
                console.error("Failed to fetch weather:", error);
                setWeather({
                    temp: 30, // Fallback
                    condition: 'Fair',
                    humidity: '70%',
                    wind: '10 km/h'
                });
            }
        };

        fetchWeather();
        // Refresh every 30 mins
        const interval = setInterval(fetchWeather, 30 * 60 * 1000); 
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col gap-4 max-w-sm pointer-events-none select-none">
            {/* Main Greeting */}
            <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl pointer-events-auto">
                <h1 className="text-3xl font-bold text-white tracking-tight drop-shadow-md">
                    Magandang Araw
                </h1>
                <p className="text-blue-200 text-sm font-medium mt-1">
                    Emergency Command Center Active
                </p>
            </div>

            {/* Weather Widget */}
            <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-6 pointer-events-auto">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400">
                        {weather.condition.includes('Rain') || weather.condition.includes('Showers') ? <CloudRain className="h-6 w-6" /> : <Sun className="h-6 w-6" />}
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-white">{weather.temp}°C</div>
                        <div className="text-xs text-blue-200 uppercase tracking-wider font-semibold">{weather.condition}</div>
                    </div>
                </div>
                <div className="h-8 w-[1px] bg-white/10"></div>
                <div className="flex gap-4">
                     <div className="flex flex-col items-center">
                        <Wind className="h-3 w-3 text-zinc-400 mb-1" />
                        <span className="text-xs text-zinc-300 font-medium">{weather.wind}</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <Thermometer className="h-3 w-3 text-zinc-400 mb-1" />
                        <span className="text-xs text-zinc-300 font-medium">{weather.humidity}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
