import proj4 from "proj4";

// EPSG:2056 (CH1903+ / LV95)
proj4.defs("EPSG:2056", "+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +units=m +no_defs");

export const convertEPSG2056ToWGS84 = (x: number, y: number): [number, number] => {
  const [lon, lat] = proj4("EPSG:2056", "WGS84", [x, y]);
  return [lon, lat];
};