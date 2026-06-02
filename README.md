# 🗺️ Memory Road

Memory Road je mobilna aplikacija za spremanje i dijeljenje osobnih uspomena na interaktivnoj karti. Svaka uspomena je pin na karti — fotografiraj trenutak, dodaj opis i zauvijek zapamti gdje si bio.

## 👥 Tim

- Josip Čavar
- Safet Srna
- Jozo Matej Lasić
- Ivan Živković

## 📱 Funkcionalnosti

### 🗺️ Karta
- Interaktivna Google karta s pinovima uspomena
- Heatmap prikaz aktivnosti 🔥
- Glassmorphism popup s pregledom uspomene
- Floating action button za brzo dodavanje
- Shake to random memory 📳
- Memory of the day 📅
- Timeline prikaz 🗓️

### 📸 Uspomene
- Dodavanje s kamerom ili galerijom (do 5 slika)
- Automatsko spremanje GPS lokacije
- Favoriti ❤️
- Fullscreen pregled slika
- Swipe to delete, Pull to refresh

### 🏆 Gamifikacija
- 12 dostignuća s progress barom i konfeti animacijom
- Tjedni i mjesečni izazovi

### 👥 Socijalne funkcije
- Praćenje prijatelja
- Pregled tuđe karte
- QR kod i link dijeljenje

### 📊 Statistike
- Grafikon uspomena po mjesecima
- Broj posjećenih država
- Ukupni prijeđeni km

### 🎨 Dizajn i UX
- Dark/Light mode
- Inter font
- Animirani splash screen
- Skeleton loading
- Haptic feedback
- Onboarding ekran za nove korisnike

### 📵 Offline podrška
- Caching uspomena
- Offline banner

## 🛠️ Tehnologije

| Tehnologija | Upotreba |
|---|---|
| React Native + Expo Go | Mobilna aplikacija |
| Expo Router | Navigacija |
| Supabase Auth | Autentifikacija korisnika |
| Supabase Storage | Pohrana slika |
| Firebase Firestore | Baza podataka |
| React Native Maps | Karta s pinovima |
| Expo Location | GPS lokacija |
| Expo Camera | Fotografiranje |
| Expo Blur | Glassmorphism efekt |
| Expo Haptics | Haptički feedback |
| Expo Sensors | Shake detekcija |
| React Native Chart Kit | Grafikoni |

## 🚀 Pokretanje projekta

### Preduvjeti

- Node.js
- Expo Go aplikacija na mobitelu
- Supabase račun
- Firebase račun

### Instalacija

```bash
git clone https://github.com/JosipCavar/memory-road.git
cd memory-road
npm install --legacy-peer-deps
```

### Konfiguracija

Kreiraj .env fajl u root direktoriju:
```bash
EXPO_PUBLIC_SUPABASE_URL=tvoj_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=tvoj_supabase_anon_key
EXPO_PUBLIC_FIREBASE_API_KEY=tvoj_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=tvoj_projekt.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=tvoj_projekt_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=tvoj_projekt.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tvoj_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=tvoj_app_id
```
### Pokretanje

```bash
npx expo start
```
Skeniraj QR kod s Expo Go aplikacijom.

## 📁 Struktura projekta
```bash
memory-road/
├── app/
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/
│   │   ├── map.tsx
│   │   ├── add-memory.tsx
│   │   └── profile.tsx
│   ├── memory/
│   │   ├── [id].tsx
│   │   └── edit/[id].tsx
│   ├── share/[userId].tsx
│   ├── memories-list.tsx
│   ├── timeline.tsx
│   ├── achievements.tsx
│   ├── challenges.tsx
│   ├── friends.tsx
│   ├── stats-chart.tsx
│   ├── memoryoftheday.tsx
│   └── onboarding.tsx
├── lib/
│   ├── supabase.ts
│   ├── firestore.ts
│   ├── ThemeContext.tsx
│   ├── achievements.ts
│   ├── challenges.ts
│   ├── friends.ts
│   ├── geocoding.ts
│   ├── haptics.ts
│   ├── useShake.ts
│   ├── offlineStorage.ts
│   ├── useNetworkStatus.ts
│   └── errorHandler.ts
├── components/
│   ├── SkeletonLoader.tsx
│   └── SplashAnimation.tsx
└── assets/
```
## 🗄️ Baza podataka

### Firestore kolekcije

memories:
- title: string
- description: string
- latitude: number
- longitude: number
- imageUrl: string
- imageUrls: string[]
- userId: string
- createdAt: string
- isFavorite: boolean

users:
- username: string
- email: string
- shareToken: string
- avatarUrl: string
- createdAt: string

following:
- followerId: string
- followingId: string
- createdAt: string

### Supabase Storage

- Bucket: memories (public) — slike uspomena
- Bucket: avatars (public) — profilne slike
- Path: {userId}/{timestamp}.jpg

## 📋 Predmet

Programiranje aplikacija za mobilne uređaje
