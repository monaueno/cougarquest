export interface Quest {
  id: string;
  title: string;
  description: string;
  location: {
    name: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  points: number;
  imageUrl: string;
  googleMapsUrl: string;
  createdAt: Date;
  completedBy: string[];
}

export interface User {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
  points: number;
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