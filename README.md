# 🗺️ Memory Road

Memory Road je mobilna aplikacija za spremanje i dijeljenje osobnih uspomena na interaktivnoj karti. Svaka uspomena je pin na karti — fotografiraj trenutak, dodaj opis i zauvijek zapamti gdje si bio.

## 👥 Tim

- Josip Ćavar
- Safet Srna
- Jozo Matej Lasić
- Ivan Zivković

## 📱 Funkcionalnosti

- 🔐 **Registracija i prijava** — Supabase autentifikacija
- 🗺️ **Interaktivna karta** — Google Maps s pinovima uspomena
- 📷 **Dodavanje uspomena** — kamera ili galerija + automatska lokacija
- 👁️ **Pregled uspomene** — slika, opis, datum i koordinate
- 🔗 **Dijeljenje karte** — generiraj link i podijeli svoju kartu s drugima
- 👤 **Privatni profil** — samo ti vidiš svoje uspomene

## 🛠️ Tehnologije

| Tehnologija | Upotreba |
|---|---|
| React Native + Expo Go | Mobilna aplikacija |
| Expo Router | Navigacija |
| Supabase Auth | Autentifikacija korisnika |
| Supabase Storage | Pohrana slika |
| Firebase Firestore | Baza podataka (uspomene, korisnici) |
| React Native Maps | Karta s pinovima |
| Expo Location | GPS lokacija |
| Expo Camera | Fotografiranje |

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

Kreiraj `.env` fajl u root direktoriju:

```env
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

```
memory-road/
├── app/
│   ├── (auth)/
│   │   ├── login.tsx        # Ekran za prijavu
│   │   └── register.tsx     # Ekran za registraciju
│   ├── (tabs)/
│   │   ├── _layout.tsx      # Tab navigacija
│   │   ├── map.tsx          # Glavna karta
│   │   ├── add-memory.tsx   # Dodavanje uspomene
│   │   └── profile.tsx      # Profil korisnika
│   ├── memory/
│   │   └── [id].tsx         # Detalj uspomene
│   ├── share/
│   │   └── [userId].tsx     # Javna karta (bez login)
│   └── _layout.tsx          # Root layout
├── lib/
│   ├── supabase.ts          # Supabase konfiguracija
│   └── firestore.ts         # Firebase konfiguracija
└── .env                     # API ključevi (nije na Gitu)
```

## 🗄️ Baza podataka

### Firestore kolekcije

**memories**
```
{
  title: string,
  description: string,
  latitude: number,
  longitude: number,
  imageUrl: string,
  userId: string,
  createdAt: string
}
```

**users**
```
{
  username: string,
  email: string,
  shareToken: string,
  createdAt: string
}
```

### Supabase Storage

- Bucket: `memories` (public)
- Path: `{userId}/{timestamp}.jpg`

## 📋 Predmet

Programiranje aplikacija za mobilne uređaje
