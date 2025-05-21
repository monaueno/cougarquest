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
  createdAt: string; // ISO string timestamp
  completedAt?: string; // ISO string timestamp for when the quest was completed
}

export interface User {
  id: string;
  name: string; // Non-nullable name for leaderboard
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  points: number;
  isAdmin: boolean;
  sons: string[];
  completedQuests: string[];
  teamName?: string; // Optional custom team name
  grandpa?: string; // Optional grandpa name
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  photoURL?: string;
  points: number;
  rank: number;
} 