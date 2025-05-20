export function parseCoordsFromGoogleMapsLink(link: string): { latitude: number, longitude: number } | null {
  if (!link) return null;
  // Match patterns like .../place/lat,lng or ...q=lat,lng
  const regex = /([\-\d\.]+),([\-\d\.]+)/;
  const match = link.match(regex);
  if (match && match[1] && match[2]) {
    return {
      latitude: parseFloat(match[1]),
      longitude: parseFloat(match[2])
    };
  }
  return null;
} 