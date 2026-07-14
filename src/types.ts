export type Mood = 'Happy' | 'Relaxed' | 'Romantic' | 'Party' | 'Stressed' | 'Tired'
export type MoodTheme = 'golden-hour' | 'flirt' | 'soft-mood' | 'after-dark' | 'bold' | 'escape' | 'celebration' | 'rainy-day' | 'sweet-crush' | 'chill'
export type Alcohol = 'Vodka' | 'Gin' | 'Rum' | 'Whiskey' | 'Tequila' | 'Brandy' | 'Soju' | 'Beer' | 'Wine'
export type Strength = 'Light' | 'Medium' | 'Strong'
export interface Cocktail { id: number; name: string; mood: Mood; alcohol: Alcohol; level: Strength; description: string; ingredients: string[]; steps: string[]; time: string; playlist: string; colors: string; }
