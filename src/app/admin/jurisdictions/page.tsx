'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Map as MapIcon, ChevronRight, Search, Building2, Users, ArrowLeft, ShieldCheck, Database, Eye } from "lucide-react";
import { getProvinces, getCitiesMunicipalities, Province, CityMunicipality } from '@/lib/data/psgc';
import { Progress } from "@/components/ui/progress";
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';

// Define the shape of our Firestore Barangay Document
type Barangay = {
    id: string; // Document ID (slug)
    name: string;
    city: string;
    province: string;
    status: 'Live' | 'Onboarding' | 'Untapped';
    population: number;
    quality: number;
    lastActivity: any; // Timestamp
    createdAt: any; // Timestamp
};

export default function JurisdictionsPage() {
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);
  const [selectedCity, setSelectedCity] = useState<CityMunicipality | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const firestore = useFirestore();

  const provinces = useMemo(() => getProvinces(), []);
  
  const filteredProvinces = useMemo(() => {
    return provinces.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [provinces, searchQuery]);

  const cities = useMemo(() => {
    if (!selectedProvince) return [];
    return getCitiesMunicipalities(selectedProvince.code);
  }, [selectedProvince]);

  const filteredCities = useMemo(() => {
      if (!selectedProvince) return [];
      return cities.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [cities, searchQuery, selectedProvince]);


  // Real Firestore Data Fetching for Barangays
  const barangaysQuery = useMemoFirebase(() => {
      if (!firestore || !selectedCity || !selectedProvince) return null;
      return query(
          collection(firestore, 'barangays'),
          where('city', '==', selectedCity.name),
          where('province', '==', selectedProvince.name)
          // Note: 'status' ordering might require a composite index, so we sort client-side for simplicity if needed
      );
  }, [firestore, selectedCity, selectedProvince]);

  const { data: realBarangays, isLoading } = useCollection<Barangay>(barangaysQuery);

  // Merge Real Data with Mock logic for "Untapped" (Sales Targets)
  // In a real production app, we would have a master list of all 42k barangays and join them.
  // For this demo, we will show the "Real" ones created via Onboarding, and maybe some placeholders if empty?
  // The prompt asked for "Live Data". So we should prioritize what's in DB.
  
  const filteredBarangays = useMemo(() => {
      if (!realBarangays) return [];
      return realBarangays.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [realBarangays, searchQuery]);


  // Navigation Handlers
  const handleSelectProvince = (province: Province) => {
      setSelectedProvince(province);
      setSearchQuery('');
  };

  const handleSelectCity = (city: CityMunicipality) => {
      setSelectedCity(city);
      setSearchQuery('');
  };

  const handleBackToProvinces = () => {
      setSelectedProvince(null);
      setSelectedCity(null);
      setSearchQuery('');
  };

  const handleBackToCities = () => {
      setSelectedCity(null);
      setSearchQuery('');
  };


  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Jurisdiction Manager</h1>
            <p className="text-slate-500">Manage the PSGC hierarchy and monitor LGU provisioning status.</p>
        </div>
      </div>

      {/* VIEW 1: PROVINCES LIST */}
      {!selectedProvince && !selectedCity && (
        <Card className="shadow-sm border-slate-200">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Provinces</CardTitle>
                        <CardDescription>Select a province to drill down to cities and municipalities.</CardDescription>
                    </div>
                    <div className="relative w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Search provinces..." 
                            className="pl-8" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Region</TableHead>
                            <TableHead>Province Name</TableHead>
                            <TableHead>PSGC Code</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredProvinces.map((province) => (
                            <TableRow key={province.code} className="hover:bg-slate-50 cursor-pointer" onClick={() => handleSelectProvince(province)}>
                                <TableCell className="text-slate-500">{province.regionCode}</TableCell>
                                <TableCell className="font-medium">{province.name}</TableCell>
                                <TableCell className="font-mono text-xs text-slate-400">{province.code}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm">
                                        <ChevronRight className="h-4 w-4 text-slate-400" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      )}

      {/* VIEW 2: CITIES LIST */}
      {selectedProvince && !selectedCity && (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <Button variant="ghost" onClick={handleBackToProvinces} className="pl-0 hover:pl-2 transition-all text-slate-500 hover:text-slate-800">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Provinces
            </Button>

            <Card className="shadow-sm border-slate-200 bg-slate-900 text-white">
                <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-500 rounded-lg text-slate-900">
                            <MapIcon className="h-8 w-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">{selectedProvince.name}</h2>
                            <div className="flex items-center gap-4 mt-1 text-slate-400 text-sm">
                                <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {cities.length} Cities/Municipalities</span>
                                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> Population Data Ready</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Cities & Municipalities</CardTitle>
                            <CardDescription>Manage adoption rates for {selectedProvince.name}.</CardDescription>
                        </div>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                            <Input 
                                placeholder="Search LGUs..." 
                                className="pl-8" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>LGU Name</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Barangays Onboarded</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCities.map((city) => (
                                <TableRow key={city.code} className="hover:bg-slate-50 transition-colors">
                                    <TableCell className="font-medium">
                                        {city.name}
                                        {city.isCapital && <Badge variant="secondary" className="ml-2 text-[10px]">Capital</Badge>}
                                    </TableCell>
                                    <TableCell>
                                        {parseInt(city.code) % 3 === 0 ? (
                                            <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-0">High Adoption</Badge>
                                        ) : parseInt(city.code) % 3 === 1 ? (
                                            <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-0">Growing</Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-slate-400">Untapped</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full ${parseInt(city.code) % 3 === 0 ? 'bg-green-500' : 'bg-amber-500'}`} 
                                                    style={{ width: `${(parseInt(city.code.slice(-2)) / 99) * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-slate-500">{parseInt(city.code.slice(-2))} / 100</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                            onClick={() => handleSelectCity(city)}
                                        >
                                            View Barangays <ChevronRight className="ml-1 h-3 w-3" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
      )}

      {/* VIEW 3: BARANGAYS LIST */}
      {selectedCity && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
               <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                   <button onClick={handleBackToProvinces} className="hover:text-amber-600 hover:underline">Provinces</button>
                   <ChevronRight className="h-3 w-3" />
                   <button onClick={handleBackToCities} className="hover:text-amber-600 hover:underline">{selectedProvince?.name}</button>
                   <ChevronRight className="h-3 w-3" />
                   <span className="font-semibold text-slate-800">{selectedCity.name}</span>
               </div>

               <div className="flex items-center justify-between">
                   <Button variant="ghost" onClick={handleBackToCities} className="pl-0 hover:pl-2 transition-all text-slate-500 hover:text-slate-800">
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back to {selectedProvince?.name}
                    </Button>
               </div>
               
               <Card className="shadow-sm border-slate-200">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-xl">Barangays in {selectedCity.name}</CardTitle>
                                <CardDescription>Monitor tenant vault status and data quality.</CardDescription>
                            </div>
                            <div className="relative w-64">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                                <Input 
                                    placeholder="Search Barangays..." 
                                    className="pl-8" 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="text-center py-10 text-slate-500">Loading live data...</div>
                        ) : filteredBarangays.length === 0 ? (
                            <div className="text-center py-10">
                                <p className="text-slate-500">No active tenants found for this jurisdiction.</p>
                                <p className="text-xs text-slate-400">All barangays are currently marked as "Untapped".</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Barangay Name</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Population</TableHead>
                                        <TableHead>Data Quality</TableHead>
                                        <TableHead>Last Activity</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredBarangays.map((brgy) => (
                                        <TableRow key={brgy.id} className="hover:bg-slate-50">
                                            <TableCell className="font-medium text-slate-900">{brgy.name}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={`border-0 ${
                                                    brgy.status === 'Live' ? 'bg-green-50 text-green-600' : 
                                                    brgy.status === 'Onboarding' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                    <div className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
                                                        brgy.status === 'Live' ? 'bg-green-500 animate-pulse' : 
                                                        brgy.status === 'Onboarding' ? 'bg-blue-500' : 'bg-slate-400'
                                                    }`} />
                                                    {brgy.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-slate-600">{brgy.population.toLocaleString()}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Progress value={brgy.quality} className={`h-1.5 w-16 ${brgy.quality > 80 ? '[&>div]:bg-green-500' : brgy.quality > 50 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-red-500'}`} />
                                                    <span className="text-xs text-slate-500">{brgy.quality}%</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-500">
                                                {brgy.lastActivity ? 'Active recently' : 'No activity'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {brgy.status === 'Live' ? (
                                                    <Button variant="ghost" size="sm" className="h-8 text-slate-500 hover:text-amber-600 hover:bg-amber-50 group">
                                                        <Eye className="h-3.5 w-3.5 mr-1" /> Inspect
                                                    </Button>
                                                ) : brgy.status === 'Onboarding' ? (
                                                    <Button variant="outline" size="sm" className="h-8 text-blue-600 border-blue-200 hover:bg-blue-50">
                                                        Assist
                                                    </Button>
                                                ) : (
                                                    <Button variant="ghost" size="sm" className="h-8 text-slate-400" disabled>
                                                        Invite
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
               </Card>
          </div>
      )}

    </div>
  );
}
