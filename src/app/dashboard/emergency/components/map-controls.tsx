
import { Button } from "@/components/ui/button";
import { Layers, ArrowLeft, Home, User, ShieldAlert, HeartPulse, Box, Accessibility, Baby, PersonStanding, Building } from "lucide-react";
import { useRouter } from "next/navigation";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export interface DemographicFilters {
    showSeniors: boolean;
    showPWDs: boolean;
    showChildren: boolean; // 0-5 y/o
    showPregnancy: boolean; // From health data
    showSoloParents: boolean;
}

interface MapControlsProps {
    showStructures: boolean;
    onToggleStructures: () => void;
    demographicFilters: DemographicFilters;
    onToggleDemographic: (key: keyof DemographicFilters) => void;
}

export const MapControls = ({ 
    showStructures, 
    onToggleStructures,
    demographicFilters,
    onToggleDemographic
}: MapControlsProps) => {
    const router = useRouter();

    return (
        <div className="flex items-end gap-2 pointer-events-none">
            {/* Back to Dashboard */}
            <div className="pointer-events-auto">
                <Button 
                    variant="secondary" 
                    className="bg-zinc-900/90 text-white hover:bg-zinc-800 border border-white/10 shadow-2xl backdrop-blur-md h-12 px-4 rounded-xl flex items-center gap-2 transition-all hover:scale-105"
                    onClick={() => router.push('/dashboard')}
                >
                    <ArrowLeft className="h-5 w-5" />
                    <span className="font-medium hidden sm:inline">Dashboard</span>
                </Button>
            </div>

            {/* Layer Control Popover */}
            <div className="pointer-events-auto">
                <Popover>
                    <PopoverTrigger asChild>
                         <Button 
                            className="bg-blue-600 hover:bg-blue-700 text-white border border-white/10 shadow-2xl backdrop-blur-md h-12 px-4 rounded-xl flex items-center gap-2 transition-all hover:scale-105"
                        >
                            <Layers className="h-5 w-5" />
                            <span className="font-medium">Map Layers</span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 bg-zinc-900 border-zinc-800 text-zinc-100 p-4" side="top" align="start">
                        <div className="space-y-4">
                            
                            {/* Infrastructure */}
                            <div>
                                <h4 className="font-medium leading-none text-zinc-400 text-xs uppercase tracking-wider mb-3">Infrastructure</h4>
                                <div className="flex items-center space-x-2">
                                    <Checkbox 
                                        id="structures" 
                                        checked={showStructures}
                                        onCheckedChange={onToggleStructures}
                                        className="border-zinc-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                    />
                                    <Label htmlFor="structures" className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                                        <Home className="h-4 w-4 text-zinc-400" />
                                        Structures & Puroks
                                    </Label>
                                </div>
                            </div>

                            {/* Demographics */}
                            <div>
                                <h4 className="font-medium leading-none text-zinc-400 text-xs uppercase tracking-wider mb-3 pt-2 border-t border-zinc-800">Vulnerable Sectors</h4>
                                <div className="space-y-3">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox 
                                            id="seniors" 
                                            checked={demographicFilters.showSeniors}
                                            onCheckedChange={() => onToggleDemographic('showSeniors')}
                                            className="border-zinc-600 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                                        />
                                        <Label htmlFor="seniors" className="flex items-center gap-2 cursor-pointer text-sm">
                                            <PersonStanding className="h-4 w-4 text-amber-400" />
                                            Senior Citizens
                                        </Label>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <Checkbox 
                                            id="pwds" 
                                            checked={demographicFilters.showPWDs}
                                            onCheckedChange={() => onToggleDemographic('showPWDs')}
                                            className="border-zinc-600 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                                        />
                                        <Label htmlFor="pwds" className="flex items-center gap-2 cursor-pointer text-sm">
                                            <Accessibility className="h-4 w-4 text-purple-400" />
                                            PWDs
                                        </Label>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <Checkbox 
                                            id="children" 
                                            checked={demographicFilters.showChildren}
                                            onCheckedChange={() => onToggleDemographic('showChildren')}
                                            className="border-zinc-600 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500"
                                        />
                                        <Label htmlFor="children" className="flex items-center gap-2 cursor-pointer text-sm">
                                            <Baby className="h-4 w-4 text-sky-400" />
                                            Children (0-5 y/o)
                                        </Label>
                                    </div>
                                    
                                     <div className="flex items-center space-x-2">
                                        <Checkbox 
                                            id="soloparent" 
                                            checked={demographicFilters.showSoloParents}
                                            onCheckedChange={() => onToggleDemographic('showSoloParents')}
                                            className="border-zinc-600 data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500"
                                        />
                                        <Label htmlFor="soloparent" className="flex items-center gap-2 cursor-pointer text-sm">
                                            <User className="h-4 w-4 text-rose-400" />
                                            Solo Parents
                                        </Label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
};
