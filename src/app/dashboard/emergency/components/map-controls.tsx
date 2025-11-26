
import { Button } from "@/components/ui/button";
import { Plus, Minus, Layers, Filter } from "lucide-react";

export const MapControls = () => {
    return (
        <div className="flex flex-col gap-2 pointer-events-none">
            <div className="bg-black/40 backdrop-blur-md border border-white/10 p-2 rounded-xl shadow-2xl flex flex-col gap-2 pointer-events-auto">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg">
                    <Plus className="h-4 w-4" />
                </Button>
                <div className="h-[1px] bg-white/10 w-full mx-auto" />
                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg">
                    <Minus className="h-4 w-4" />
                </Button>
            </div>
            
            <div className="bg-black/40 backdrop-blur-md border border-white/10 p-2 rounded-xl shadow-2xl flex flex-col gap-2 mt-2 pointer-events-auto">
                 <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg" title="Map Layers">
                    <Layers className="h-4 w-4" />
                </Button>
                 <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg" title="Filters">
                    <Filter className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};
