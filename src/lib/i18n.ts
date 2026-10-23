export const LOCALES = ["en", "fr", "de", "es"] as const;
export type Locale = (typeof LOCALES)[number];

const dict: Record<Locale, Record<string, string>> = {
  en: {
    home: "Home",
    explore: "Explore",
    bookings: "Bookings",
    favourites: "Favourites",
    profile: "Profile",
    askAi: "Ask NaijaSpa AI",
    installTitle: "Install NaijaSpa",
    installBody:
      "Your favourite spa and wellness experiences, one tap away. Discover treatments, manage appointments and enjoy a smoother NaijaSpa experience.",
    installCta: "Install App",
    maybeLater: "Maybe Later",
    switchLight: "Switch to Light Mode",
    switchDark: "Switch to Dark Mode",
    sponsored: "Sponsored",
    book: "Book now"
  },
  fr: {
    home: "Accueil",
    explore: "Explorer",
    bookings: "Réservations",
    favourites: "Favoris",
    profile: "Profil",
    askAi: "Demander à NaijaSpa IA",
    installTitle: "Installer NaijaSpa",
    installBody:
      "Vos expériences spa et bien-être préférées, à un tap. Découvrez des soins, gérez vos rendez-vous et profitez de NaijaSpa.",
    installCta: "Installer l’application",
    maybeLater: "Plus tard",
    switchLight: "Passer en mode clair",
    switchDark: "Passer en mode sombre",
    sponsored: "Sponsorisé",
    book: "Réserver"
  },
  de: {
    home: "Start",
    explore: "Entdecken",
    bookings: "Buchungen",
    favourites: "Favoriten",
    profile: "Profil",
    askAi: "NaijaSpa KI fragen",
    installTitle: "NaijaSpa installieren",
    installBody:
      "Ihre Spa- und Wellness-Erlebnisse, nur einen Tipp entfernt. Behandlungen entdecken, Termine verwalten und NaijaSpa genießen.",
    installCta: "App installieren",
    maybeLater: "Vielleicht später",
    switchLight: "Zum hellen Modus wechseln",
    switchDark: "Zum dunklen Modus wechseln",
    sponsored: "Gesponsert",
    book: "Jetzt buchen"
  },
  es: {
    home: "Inicio",
    explore: "Explorar",
    bookings: "Reservas",
    favourites: "Favoritos",
    profile: "Perfil",
    askAi: "Preguntar a NaijaSpa IA",
    installTitle: "Instalar NaijaSpa",
    installBody:
      "Tus experiencias de spa y bienestar, a un toque. Descubre tratamientos, gestiona citas y disfruta NaijaSpa.",
    installCta: "Instalar app",
    maybeLater: "Más tarde",
    switchLight: "Cambiar a modo claro",
    switchDark: "Cambiar a modo oscuro",
    sponsored: "Patrocinado",
    book: "Reservar"
  }
};

export function t(locale: string, key: string): string {
  const loc = (LOCALES as readonly string[]).includes(locale) ? (locale as Locale) : "en";
  return dict[loc][key] ?? dict.en[key] ?? key;
}
