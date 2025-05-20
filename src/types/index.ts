export interface Quest {
  id: string;
  title: string;
  description: string;
  location: {
    coordinates: {
      latitude: number;
      longitude: number;
    };
    address: string;
  };
  points: number;
  photoURL: string;
  completedBy: string[];
  googleMapsLink: string;
  mapsLink?: string; // Keep the old field as optional for backward compatibility
}

export interface User {
  id: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  points: number;
  isAdmin: boolean;
  sons: string[];
  completedQuests: string[];
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  photoURL?: string;
  points: number;
  rank: number;
} 