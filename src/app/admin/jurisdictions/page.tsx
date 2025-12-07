'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Map as MapIcon, ChevronRight, Search, Building2, Users, ArrowLeft, ShieldCheck, Database, Eye, PlusCircle, Trash2, FileText, CheckCircle2, Loader2, Link as LinkIcon, Copy } from "lucide-react";
import { getProvinces, getCitiesMunicipalities, fetchBarangays, Province, CityMunicipality, Barangay as PSGCBarangay } from '@/lib/data/psgc';
import { Progress } from "@/components/ui/progress";
import { useCollection, useFirestore, useMemoFirebase, useAuth } from '@/firebase';
import { collection, query, where, orderBy, doc, deleteDoc } from 'firebase/firestore';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription as DialogDesc
} from "@/components/ui/dialog";
import { getRegionByProvince } from '@/lib/data/psgc';

// Define the shape of our Firestore Barangay Document
type TenantBarangay = {
    id: string; // Document ID (slug)
    name: string;
    city: string;
    province: string;
    status: 'Live' | 'Onboarding' | 'Untapped';
    population: number;
    quality: number;
    lastActivity: any; // Timestamp
    createdAt: any; // Timestamp
    tenantId?: string; // New Arch
};

export default function JurisdictionsPage() {
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);
  const [selectedCity, setSelectedCity] = useState<CityMunicipality | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [tenantToInspect, setTenantToInspect] = useState<TenantBarangay | null>(null);
  
  // State for official PSGC list
  const [masterBarangays, setMasterBarangays] = useState<PSGCBarangay[]>([]);
  const [isLoadingMaster, setIsLoadingMaster] = useState(false);

  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

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


  // Data Fetching: Prioritize 'tenant_directory' (New Arch), fallback/merge 'barangays' (Legacy) logic implied.
  // Actually, let's just query 'tenant_directory' as the source of truth for "Provisioned Vaults".
  const tenantsQuery = useMemoFirebase(() => {
      if (!firestore || !auth?.currentUser || !selectedCity || !selectedProvince) return null;
      return query(
          collection(firestore, 'tenant_directory'),
          where('city', '==', selectedCity.name),
          where('province', '==', selectedProvince.name)
      );
  }, [firestore, auth?.currentUser, selectedCity, selectedProvince]);

  const { data: tenantBarangays, isLoading: isLoadingTenants } = useCollection<TenantBarangay>(tenantsQuery);

  // Fetch Master List when City is selected
  useEffect(() => {
      if (selectedCity) {
          setIsLoadingMaster(true);
          fetchBarangays(selectedCity.code)
            .then(data => {
                setMasterBarangays(data.sort((a, b) => a.name.localeCompare(b.name)));
                setIsLoadingMaster(false);
            })
            .catch(() => setIsLoadingMaster(false));
      } else {
          setMasterBarangays([]);
      }
  }, [selectedCity]);


  // MERGE LOGIC: Master List + Tenant List
  const mergedBarangays = useMemo(() => {
      if (!selectedCity) return [];
      
      return masterBarangays.map(official => {
          // Find matching tenant
          const tenant = tenantBarangays?.find(t => 
              t.name.toLowerCase() === official.name.toLowerCase() || 
              t.name.toLowerCase().includes(official.name.toLowerCase())
          );

          if (tenant) {
              return {
                  ...tenant,
                  // Normalize fields if missing in directory (directory has limited subset)
                  status: tenant.status || 'Live',
                  population: tenant.population || 0,
                  quality: tenant.quality || 100,
                  id: tenant.id || tenant.tenantId, // Use directory ID (slug)
                  isOfficial: true,
                  psgcCode: official.code
              };
          }

          // Return Untapped
          return {
              id: `untapped-${official.code}`,
              name: official.name,
              city: selectedCity.name,
              province: selectedProvince?.name,
              status: 'Untapped',
              population: 0,
              quality: 0,
              lastActivity: null,
              psgcCode: official.code,
              isOfficial: true
          } as any; 
      });
  }, [masterBarangays, tenantBarangays, selectedCity, selectedProvince]);

  const filteredMergedBarangays = useMemo(() => {
      return mergedBarangays.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [mergedBarangays, searchQuery]);


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

  const handleDeleteTenant = async (id: string) => {
      if (!auth?.currentUser) return;
      setIsDeleting(true);
      try {
          const token = await auth.currentUser.getIdToken();
          const res = await fetch('/api/admin/delete-tenant', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ tenantId: id })
          });

          if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error || 'Failed to delete');
          }

          toast({ title: "Tenant Deleted", description: "The barangay has been reset to 'Untapped' status." });
      } catch (e: any) {
          console.error(e);
          toast({ variant: "destructive", title: "Error", description: e.message });
      } finally {
          setIsDeleting(false);
      }
  };

  const generateOnboardingLink = (barangayName: string) => {
      if (!selectedProvince || !selectedCity) return '';
      
      const region = getRegionByProvince(selectedProvince.code);
      const params = new URLSearchParams({
          province: selectedProvince.name,
          city: selectedCity.name,
          barangay: barangayName,
          region: region
      });
      
      // In production, use window.location.origin
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      return `${baseUrl}/onboarding?${params.toString()}`;
  };

  const copyLinkToClipboard = (link: string) => {
      navigator.clipboard.writeText(link);
      toast({ title: "Link Copied", description: "Onboarding link copied to clipboard." });
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
                                <TableRow 
                                    key={city.code} 
                                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                                    onClick={() => handleSelectCity(city)}
                                >
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
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSelectCity(city);
                                            }}
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
                        {isLoadingMaster || isLoadingTenants ? (
                            <div className="text-center py-10 text-slate-500 flex flex-col items-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mb-2"></div>
                                Loading PSGC data...
                            </div>
                        ) : filteredMergedBarangays.length === 0 ? (
                            <div className="text-center py-10">
                                <p className="text-slate-500">No barangays found.</p>
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
                                    {filteredMergedBarangays.map((brgy) => (
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
                                            <TableCell className="font-mono text-slate-600">{brgy.population > 0 ? brgy.population.toLocaleString() : '-'}</TableCell>
                                            <TableCell>
                                                {brgy.quality > 0 ? (
                                                    <div className="flex items-center gap-2">
                                                        <Progress value={brgy.quality} className={`h-1.5 w-16 ${brgy.quality > 80 ? '[&>div]:bg-green-500' : brgy.quality > 50 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-red-500'}`} />
                                                        <span className="text-xs text-slate-500">{brgy.quality}%</span>
                                                    </div>
                                                ) : <span className="text-xs text-slate-400">N/A</span>}
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-500">
                                                {brgy.lastActivity ? 'Active recently' : '-'}
                                            </TableCell>
                                            <TableCell className="text-right flex items-center justify-end gap-2">
                                                {brgy.status === 'Live' ? (
                                                    <>
                                                        <Button variant="ghost" size="sm" className="h-8 text-slate-500 hover:text-amber-600 hover:bg-amber-50 group" onClick={() => setTenantToInspect(brgy)}>
                                                            <Eye className="h-3.5 w-3.5 mr-1" /> Inspect
                                                        </Button>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50">
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Delete Tenant?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        This will permanently delete the vault for <strong>{brgy.name}</strong>. 
                                                                        This action cannot be undone.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleDeleteTenant(brgy.id)} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
                                                                        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </>
                                                ) : (
                                                    <div className="flex gap-2">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            className="h-8 text-slate-500 hover:bg-slate-100"
                                                            onClick={() => copyLinkToClipboard(generateOnboardingLink(brgy.name))}
                                                            title="Copy Onboarding Link"
                                                        >
                                                            <LinkIcon className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            className="h-8 text-amber-600 hover:bg-amber-50"
                                                            asChild
                                                        >
                                                            <Link href={`/onboarding?province=${encodeURIComponent(selectedProvince?.name ?? '')}&city=${encodeURIComponent(selectedCity.name)}&barangay=${encodeURIComponent(brgy.name)}`}>
                                                                <PlusCircle className="h-3.5 w-3.5 mr-1" /> Provision
                                                            </Link>
                                                        </Button>
                                                    </div>
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

        {/* TENANT DETAILS INSPECTION DIALOG */}
        <Dialog open={!!tenantToInspect} onOpenChange={(open) => !open && setTenantToInspect(null)}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-green-600" />
                        {tenantToInspect?.name}
                    </DialogTitle>
                    <DialogDesc>Tenant Vault Details</DialogDesc>
                </DialogHeader>
                {tenantToInspect && (
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <span className="text-xs font-medium text-muted-foreground uppercase">Vault ID</span>
                                <div className="font-mono text-sm bg-slate-100 p-2 rounded truncate" title={tenantToInspect.id}>
                                    {tenantToInspect.id}
                                </div>
                            </div>
                             <div className="space-y-1">
                                <span className="text-xs font-medium text-muted-foreground uppercase">Status</span>
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-green-100 text-green-700 border-0 hover:bg-green-200">
                                        <CheckCircle2 className="h-3 w-3 mr-1" /> Live
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-3">
                             <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">Location:</span>
                                <span className="font-medium">{tenantToInspect.city}, {tenantToInspect.province}</span>
                             </div>
                             <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">Population:</span>
                                <span className="font-medium">{tenantToInspect.population?.toLocaleString() || 0}</span>
                             </div>
                             <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">Data Quality Score:</span>
                                <span className="font-medium text-green-600">{tenantToInspect.quality || 0}%</span>
                             </div>
                             <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">Created:</span>
                                <span className="font-mono text-xs">{tenantToInspect.createdAt?.toDate ? tenantToInspect.createdAt.toDate().toLocaleDateString() : 'N/A'}</span>
                             </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                             <Button variant="outline" onClick={() => setTenantToInspect(null)}>Close</Button>
                             <Button asChild className="bg-slate-900 text-white">
                                 <Link href={`/dashboard`}>
                                     <FileText className="mr-2 h-4 w-4" /> Enter Vault
                                 </Link>
                             </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>

    </div>
  );
}
