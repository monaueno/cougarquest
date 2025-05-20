const GOOGLE_MAPS_API_KEY = 'AIzaSyDkKwVbdR2ysG2g4SVSFL1T-I1VGt7zV1o';

export async function getAddressFromCoords(lat: number, lng: number): Promise<string> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.status === 'OK' && data.results.length > 0) {
      return data.results[0].formatted_address;
    } else {
      return '';
    }
  } catch (error) {
    console.error('Geocoding error:', error);
    return '';
  }
} 