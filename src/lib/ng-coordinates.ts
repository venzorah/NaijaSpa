import type { LivePlace } from "./nigeria";

type Box = { state: string; city: string; lat: [number, number]; lng: [number, number] };

/** FCT and Lagos first so overlapping neighbours do not steal Abuja or Lagos. */
const NG_BOXES: Box[] = [
  { state: "FCT", city: "Abuja", lat: [8.35, 9.35], lng: [6.85, 7.72] },
  { state: "Lagos", city: "Lagos", lat: [6.2, 6.75], lng: [2.7, 4.35] },
  { state: "Abia", city: "Umuahia", lat: [4.8, 6.05], lng: [7.0, 8.05] },
  { state: "Adamawa", city: "Yola", lat: [7.8, 11.0], lng: [11.3, 13.8] },
  { state: "Akwa Ibom", city: "Uyo", lat: [4.3, 5.55], lng: [7.3, 8.4] },
  { state: "Anambra", city: "Awka", lat: [5.7, 6.8], lng: [6.5, 7.4] },
  { state: "Bauchi", city: "Bauchi", lat: [9.3, 12.5], lng: [8.7, 11.8] },
  { state: "Bayelsa", city: "Yenagoa", lat: [4.2, 5.55], lng: [5.3, 6.8] },
  { state: "Benue", city: "Makurdi", lat: [6.5, 8.2], lng: [7.5, 10.0] },
  { state: "Borno", city: "Maiduguri", lat: [10.0, 13.8], lng: [11.5, 14.7] },
  { state: "Cross River", city: "Calabar", lat: [4.8, 6.9], lng: [8.0, 9.5] },
  { state: "Delta", city: "Asaba", lat: [5.0, 6.6], lng: [5.0, 6.8] },
  { state: "Ebonyi", city: "Abakaliki", lat: [5.7, 6.8], lng: [7.5, 8.5] },
  { state: "Edo", city: "Benin City", lat: [5.7, 7.6], lng: [5.0, 6.7] },
  { state: "Ekiti", city: "Ado-Ekiti", lat: [7.3, 8.1], lng: [4.8, 5.9] },
  { state: "Enugu", city: "Enugu", lat: [6.0, 7.1], lng: [6.9, 7.9] },
  { state: "Gombe", city: "Gombe", lat: [9.5, 11.3], lng: [10.5, 11.9] },
  { state: "Imo", city: "Owerri", lat: [5.2, 6.0], lng: [6.6, 7.6] },
  { state: "Jigawa", city: "Dutse", lat: [11.0, 13.0], lng: [8.0, 10.7] },
  { state: "Kaduna", city: "Kaduna", lat: [9.0, 11.6], lng: [6.0, 8.8] },
  { state: "Kano", city: "Kano", lat: [10.5, 12.7], lng: [7.6, 9.5] },
  { state: "Katsina", city: "Katsina", lat: [11.2, 13.4], lng: [6.5, 9.2] },
  { state: "Kebbi", city: "Birnin Kebbi", lat: [10.0, 13.2], lng: [3.5, 6.0] },
  { state: "Kogi", city: "Lokoja", lat: [6.7, 8.8], lng: [5.3, 8.0] },
  { state: "Kwara", city: "Ilorin", lat: [8.0, 10.2], lng: [2.8, 6.2] },
  { state: "Nasarawa", city: "Lafia", lat: [7.7, 9.3], lng: [7.0, 9.6] },
  { state: "Niger", city: "Minna", lat: [8.0, 11.3], lng: [3.5, 7.3] },
  { state: "Ogun", city: "Abeokuta", lat: [6.2, 7.9], lng: [2.6, 4.9] },
  { state: "Ondo", city: "Akure", lat: [5.8, 7.8], lng: [4.3, 6.1] },
  { state: "Osun", city: "Osogbo", lat: [7.0, 8.1], lng: [4.0, 5.6] },
  { state: "Oyo", city: "Ibadan", lat: [7.0, 9.2], lng: [2.6, 4.7] },
  { state: "Plateau", city: "Jos", lat: [8.3, 10.4], lng: [8.5, 10.6] },
  { state: "Rivers", city: "Port Harcourt", lat: [4.3, 5.7], lng: [6.3, 7.6] },
  { state: "Sokoto", city: "Sokoto", lat: [11.0, 13.9], lng: [4.0, 6.8] },
  { state: "Taraba", city: "Jalingo", lat: [6.5, 9.6], lng: [9.5, 12.0] },
  { state: "Yobe", city: "Damaturu", lat: [10.5, 13.4], lng: [9.6, 12.8] },
  { state: "Zamfara", city: "Gusau", lat: [10.2, 13.2], lng: [5.5, 7.8] }
];

export function placeFromCoordinates(lat: number, lng: number): LivePlace | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  for (const box of NG_BOXES) {
    if (lat >= box.lat[0] && lat <= box.lat[1] && lng >= box.lng[0] && lng <= box.lng[1]) {
      return {
        country: "NG",
        state: box.state,
        city: box.city,
        neighbourhood: "",
        source: "gps"
      };
    }
  }
  return null;
}
