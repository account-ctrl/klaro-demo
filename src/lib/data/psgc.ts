import provinces from './provinces.json';
import cities from './cities-municipalities.json';

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

export const getProvinces = (): Province[] => {
  return provinces as Province[];
};

export const getCitiesMunicipalities = (provinceCode?: string): CityMunicipality[] => {
  const allCities = cities as CityMunicipality[];
  if (provinceCode) {
    return allCities.filter(c => c.provinceCode === provinceCode);
  }
  return allCities;
};

export const getCityMunicipalityName = (code: string) => {
    const city = (cities as CityMunicipality[]).find(c => c.code === code);
    return city ? city.name : code;
}

export const getProvinceName = (code: string) => {
    const province = (provinces as Province[]).find(p => p.code === code);
    return province ? province.name : code;
}
