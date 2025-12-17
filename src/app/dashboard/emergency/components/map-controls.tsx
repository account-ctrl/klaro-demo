
import { Button } from "@/components/ui/button";
import { Layers, ArrowLeft, Home, User, ShieldAlert, HeartPulse, Box } from "lucide-react";
import { useRouter } from "next/navigation";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export interface MapFilters {
    showBoundaries: boolean;
    showDemographics: boolean;
    showHealth: boolean;
    showBlotter: boolean;
    showAssets: boolean;
}

interface MapControlsProps {
    filters: MapFilters;
    onToggleFilter: (key: keyof MapFilters) => void;
}

export const MapControls = ({ filters, onToggleFilter }: MapControlsProps) => {
    const router = useRouter();

    if (!filters) return null;

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
                    <PopoverContent className="w-56 bg-zinc-900 border-zinc-800 text-zinc-100 p-4" side="top" align="start">
                        <div className="space-y-4">
                            <h4 className="font-medium leading-none text-zinc-400 text-sm mb-2">Visible Data Layers</h4>
                            
                            <div className="flex items-center space-x-2">
                                <Checkbox 
                                    id="boundaries" 
                                    checked={filters.showBoundaries}
                                    onCheckedChange={() => onToggleFilter('showBoundaries')}
                                    className="border-zinc-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                />
                                <Label htmlFor="boundaries" className="flex items-center gap-2 cursor-pointer">
                                    <Home className="h-4 w-4 text-zinc-400" />
                                    Boundaries & Puroks
                                </Label>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox 
                                    id="demographics" 
                                    checked={filters.showDemographics}
                                    onCheckedChange={() => onToggleFilter('showDemographics')}
                                    className="border-zinc-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                />
                                <Label htmlFor="demographics" className="flex items-center gap-2 cursor-pointer">
                                    <User className="h-4 w-4 text-emerald-400" />
                                    Vulnerable Sectors
                                </Label>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox 
                                    id="health" 
                                    checked={filters.showHealth}
                                    onCheckedChange={() => onToggleFilter('showHealth')}
                                    className="border-zinc-600 data-[state=checked]:bg-rose-600 data-[state=checked]:border-rose-600"
                                />
                                <Label htmlFor="health" className="flex items-center gap-2 cursor-pointer">
                                    <HeartPulse className="h-4 w-4 text-rose-400" />
                                    Health Outbreaks
                                </Label>
                            </div>

                             <div className="flex items-center space-x-2">
                                <Checkbox 
                                    id="blotter" 
                                    checked={filters.showBlotter}
                                    onCheckedChange={() => onToggleFilter('showBlotter')}
                                    className="border-zinc-600 data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600"
                                />
                                <Label htmlFor="blotter" className="flex items-center gap-2 cursor-pointer">
                                    <ShieldAlert className="h-4 w-4 text-orange-400" />
                                    Crime Hotspots
                                </Label>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                                <Checkbox 
                                    id="assets" 
                                    checked={filters.showAssets}
                                    onCheckedChange={() => onToggleFilter('showAssets')}
                                    className="border-zinc-600 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                />
                                <Label htmlFor="assets" className="flex items-center gap-2 cursor-pointer">
                                    <Box className="h-4 w-4 text-indigo-400" />
                                    Assets & Fleet
                                </Label>
                            </div>

                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
};
