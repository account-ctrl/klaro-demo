
import { Button } from "@/components/ui/button";
import { Layers, Filter, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export const MapControls = () => {
    const router = useRouter();

    return (
        <div className="flex items-end gap-4 pointer-events-none">
            {/* Back to Dashboard - Now at Bottom Left, wrapped in pointer-events-auto */}
            <div className="pointer-events-auto">
                <Button 
                    variant="secondary" 
                    className="bg-zinc-900/90 text-white hover:bg-zinc-800 border border-white/10 shadow-2xl backdrop-blur-md h-12 px-4 rounded-xl flex items-center gap-2 transition-all hover:scale-105"
                    onClick={() => router.push('/dashboard')}
                >
                    <ArrowLeft className="h-5 w-5" />
                    <span className="font-medium">Back to Dashboard</span>
                </Button>
            </div>

            {/* Minimal Controls - Removed redundant zoom/plus/minus */}
            <div className="bg-black/40 backdrop-blur-md border border-white/10 p-1.5 rounded-xl shadow-2xl flex gap-1 pointer-events-auto">
                 <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg" title="Map Layers">
                    <Layers className="h-5 w-5" />
                </Button>
                 <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg" title="Filters">
                    <Filter className="h-5 w-5" />
                </Button>
            </div>
        </div>
    );
};
