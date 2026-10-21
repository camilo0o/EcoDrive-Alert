/** Punto GeoJSON. Ojo: coordinates es [longitud, latitud]. */
export interface PuntoGeo {
    type: "Point";
    coordinates: [number, number];
}
