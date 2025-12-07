'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Map as MapIcon, ChevronRight, Search, Building2, Users, ArrowLeft } from "lucide-react";
import { getProvinces, getCitiesMunicipalities, Province, CityMunicipality } from '@/lib/data/psgc';

export default function JurisdictionsPage() {
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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


  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Jurisdiction Manager</h1>
            <p className="text-slate-500">Manage the PSGC hierarchy and monitor LGU provisioning status.</p>
        </div>
      </div>

      {!selectedProvince ? (
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
                            <TableRow key={province.code} className="hover:bg-slate-50 cursor-pointer" onClick={() => { setSelectedProvince(province); setSearchQuery(''); }}>
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
      ) : (
        <div className="space-y-6">
            <Button variant="ghost" onClick={() => { setSelectedProvince(null); setSearchQuery(''); }} className="pl-0 hover:pl-2 transition-all">
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
                                <TableRow key={city.code}>
                                    <TableCell className="font-medium">
                                        {city.name}
                                        {city.isCapital && <Badge variant="secondary" className="ml-2 text-[10px]">Capital</Badge>}
                                    </TableCell>
                                    <TableCell>
                                        {/* Mock Status Logic based on Code for demo variety */}
                                        {parseInt(city.code) % 3 === 0 ? (
                                            <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-0">High Adoption</Badge>
                                        ) : parseInt(city.code) % 3 === 1 ? (
                                            <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-0">Growing</Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-slate-400">Untapped</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                         {/* Mock Counts */}
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
                                        <Button variant="ghost" size="sm" className="text-amber-600">View Barangays</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
      )}
    </div>
  );
}
