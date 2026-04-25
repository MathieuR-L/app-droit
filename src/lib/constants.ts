export const CITY_OPTIONS = [
  { value: "PARIS", label: "Paris" },
  { value: "BOBIGNY", label: "Bobigny" },
  { value: "CRETEIL", label: "Créteil" },
  { value: "NANTERRE", label: "Nanterre" },
  { value: "VERSAILLES", label: "Versailles" },
  { value: "EVRY_COURCOURONNES", label: "Évry-Courcouronnes" },
  { value: "MELUN", label: "Melun" },
  { value: "PONTOISE", label: "Pontoise" },
] as const;

export const CITY_LABELS = Object.fromEntries(
  CITY_OPTIONS.map((city) => [city.value, city.label]),
) as Record<(typeof CITY_OPTIONS)[number]["value"], string>;

export const ROLE_OPTIONS = [
  { value: "POLICIER", label: "Policier" },
  { value: "AVOCAT", label: "Avocat" },
  { value: "BATONNIER", label: "Bâtonnier" },
] as const;

export const ROLE_LABELS = Object.fromEntries(
  ROLE_OPTIONS.map((role) => [role.value, role.label]),
) as Record<(typeof ROLE_OPTIONS)[number]["value"], string>;

export const ROLE_ROUTES = {
  POLICIER: "/dashboard/policier",
  AVOCAT: "/dashboard/avocat",
  BATONNIER: "/dashboard/batonnier",
} as const;

export const ALERT_STATUS_LABELS = {
  PENDING: "En attente",
  ACCEPTED: "Acceptée",
  UNANSWERED: "Sans réponse",
  CLOSED: "Clôturée",
} as const;

export const ASSIGNMENT_STATUS_LABELS = {
  PENDING: "Notification envoyée",
  ACCEPTED: "Acceptée",
  DECLINED: "Refusée",
  EXPIRED: "Délai dépassé",
} as const;

export const DEMO_ACCOUNTS = [
  {
    role: "Bâtonnier",
    email: "batonnier@demo.fr",
    password: "demo1234",
    note: "Assigne les villes et gère l'ordre de permanence.",
  },
  {
    role: "Policier",
    email: "policier.paris@demo.fr",
    password: "demo1234",
    note: "Peut déclarer une nouvelle garde à vue à Paris.",
  },
  {
    role: "Avocat",
    email: "avocat.paris1@demo.fr",
    password: "demo1234",
    note: "Premier avocat de permanence pour Paris.",
  },
] as const;

export const DEFAULT_RESPONSE_WINDOW_MINUTES = 10;
