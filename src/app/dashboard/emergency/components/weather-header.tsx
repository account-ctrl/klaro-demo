
import { CloudRain, Sun, Wind, Thermometer } from "lucide-react";

export const WeatherHeader = () => {
    // Mock weather data as placeholders, replace with real data if available in context
    const weather = {
        temp: 28,
        condition: 'Cloudy',
        humidity: '65%',
        wind: '12 km/h'
    };

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
                        <CloudRain className="h-6 w-6" />
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
