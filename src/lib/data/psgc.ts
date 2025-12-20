
import provinces from './provinces.json';
import cities from './cities-municipalities.json';

// Minimal list for fallback
const FALLBACK_BARANGAYS = [
  { code: '045805001', name: 'San Isidro', cityCode: '045805000' },
  { code: '045805002', name: 'Santo Domingo', cityCode: '045805000' },
  { code: '045805003', name: 'San Andres', cityCode: '045805000' },
  { code: '045805004', name: 'San Juan', cityCode: '045805000' },
  { code: '045805005', name: 'Santo Niño', cityCode: '045805000' },
  { code: '045805006', name: 'Santa Rosa', cityCode: '045805000' },
];

export type Province = {
  code: string;
  name: string;
  regionCode: string;
  islandGroupCode: string;
  psgc10DigitCode: string;
};

export type CityMunicipality = {
  code: string;
  name: string;
  oldName: string;
  isCapital: boolean;
  provinceCode: string;
  districtCode: boolean;
  regionCode: string;
  islandGroupCode: string;
  psgc10DigitCode: string;
};

export type Barangay = {
    code: string;
    name: string;
    oldName?: string;
    subMunicipalityCode?: boolean;
    cityCode?: string;
    municipalityCode?: string;
    districtCode?: boolean;
    provinceCode?: string;
    regionCode?: string;
    islandGroupCode?: string;
    psgc10DigitCode?: string;
}

// Map Region Codes to Names (Manually populated based on PSGC Standards)
// Source: PSA PSGC
export const REGIONS: Record<string, string> = {
    "010000000": "Region I (Ilocos Region)",
    "020000000": "Region II (Cagayan Valley)",
    "030000000": "Region III (Central Luzon)",
    "040000000": "Region IV-A (CALABARZON)",
    "170000000": "MIMAROPA Region",
    "050000000": "Region V (Bicol Region)",
    "060000000": "Region VI (Western Visayas)",
    "070000000": "Region VII (Central Visayas)",
    "080000000": "Region VIII (Eastern Visayas)",
    "090000000": "Region IX (Zamboanga Peninsula)",
    "100000000": "Region X (Northern Mindanao)",
    "110000000": "Region XI (Davao Region)",
    "120000000": "Region XII (SOCCSKSARGEN)",
    "130000000": "Region XIII (Caraga)", // Note: Caraga code varies, checking provinces
    "140000000": "CAR (Cordillera Administrative Region)",
    "150000000": "BARMM (Bangsamoro Autonomous Region in Muslim Mindanao)",
    "160000000": "Region XIII (Caraga)", // Corrected Code for Caraga
    "130000000": "NCR (National Capital Region)", // NCR usually starts with 13
};

// Handle NCR Exception (NCR has no provinceCode in some datasets, cities map directly to region)
export const NCR_CODE = "130000000"; 

export const getProvinces = (): Province[] => {
  return provinces as Province[];
};

export const getCities = (provinceCode?: string): CityMunicipality[] => {
  const allCities = cities as CityMunicipality[];
  if (provinceCode) {
      // Some libs use name as code if not strict. 
      // But let's support finding by Name if code fails, or just filtering by code.
      // Assuming 'provinceCode' passed here is actually the NAME based on previous usage in verify-identity page
      // Let's support both.
      
      const byCode = allCities.filter(c => c.provinceCode === provinceCode);
      if (byCode.length > 0) return byCode;

      // Fallback: Filter by Province Name (Helper for UI that uses names)
      const prov = (provinces as Province[]).find(p => p.name === provinceCode);
      if (prov) {
          return allCities.filter(c => c.provinceCode === prov.code);
      }
  }
  return allCities;
};

// Alias for compatibility
export const getCitiesMunicipalities = getCities;

export const getBarangays = (cityCodeOrName?: string): Barangay[] => {
    // This is a placeholder since we don't have the full JSON for all barangays in repo (too large usually).
    // In a real app, this fetches from API or uses a larger static file.
    // We will return a static list for now or fetch if needed.
    
    // For now, return a generic list to allow UI to function
    return FALLBACK_BARANGAYS.map(b => ({...b, cityCode: 'mock'}));
};


export const getCityMunicipalityName = (code: string) => {
    const city = (cities as CityMunicipality[]).find(c => c.code === code);
    return city ? city.name : code;
}

export const getProvinceName = (code: string) => {
    const province = (provinces as Province[]).find(p => p.code === code);
    return province ? province.name : code;
}

export const getRegionName = (regionCode: string): string => {
    return REGIONS[regionCode] || regionCode;
}

export const getRegionByProvince = (provinceCode: string): string => {
    const province = (provinces as Province[]).find(p => p.code === provinceCode);
    if (!province) return "Unknown Region";
    return REGIONS[province.regionCode] || province.regionCode;
}

export const fetchBarangays = async (cityCode: string): Promise<Barangay[]> => {
    try {
        const res = await fetch(`https://psgc.gitlab.io/api/cities-municipalities/${cityCode}/barangays/`);
        if (!res.ok) throw new Error('Failed to fetch');
        return await res.json();
    } catch (e) {
        console.error("Error fetching barangays:", e);
        return [];
    }
}
