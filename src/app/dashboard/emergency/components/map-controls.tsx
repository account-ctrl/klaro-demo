
import { Button } from "@/components/ui/button";
import { Layers, Filter, ArrowLeft, Home } from "lucide-react";
import { useRouter } from "next/navigation";

interface MapControlsProps {
    showStructures: boolean;
    onToggleStructures: () => void;
}

export const MapControls = ({ showStructures, onToggleStructures }: MapControlsProps) => {
    const router = useRouter();

    return (
        <div className="flex items-end gap-2 pointer-events-none">
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

            {/* Structures Toggle */}
            <div className="pointer-events-auto">
                 <Button 
                    variant={showStructures ? "default" : "secondary"}
                    className={`h-12 px-4 rounded-xl flex items-center gap-2 transition-all hover:scale-105 border border-white/10 shadow-2xl backdrop-blur-md ${showStructures ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-zinc-900/90 text-zinc-300 hover:bg-zinc-800'}`}
                    onClick={onToggleStructures}
                >
                    <Home className="h-5 w-5" />
                    <span className="font-medium">{showStructures ? 'Hide Structures' : 'Show Structures'}</span>
                </Button>
            </div>
        </div>
    );
};
