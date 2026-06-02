export function getErrorMessage(error: any): string {
  const message = error?.message ?? '';

  // Supabase auth greške
  if (message.includes('Invalid login credentials')) return 'Pogrešan email ili lozinka';
  if (message.includes('Email not confirmed')) return 'Potvrdi email prije prijave';
  if (message.includes('User already registered')) return 'Korisnik s tim emailom već postoji';
  if (message.includes('Password should be at least')) return 'Lozinka mora imati najmanje 6 znakova';
  if (message.includes('Unable to validate email')) return 'Neispravan email format';

  // Firebase greške
  if (message.includes('permission-denied')) return 'Nemate dozvolu za ovu akciju';
  if (message.includes('not-found')) return 'Podatak nije pronađen';
  if (message.includes('network-request-failed')) return 'Greška mreže — provjeri internet konekciju';
  if (message.includes('quota-exceeded')) return 'Prekoračena kvota — pokušaj kasnije';

  // Lokacijske greške
  if (message.includes('Location')) return 'Nije moguće dohvatiti lokaciju';

  // Default
  return 'Dogodila se greška. Pokušaj ponovo.';
}