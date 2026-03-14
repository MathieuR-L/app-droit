export const CITY_OPTIONS = [
  { value: "PARIS", label: "Paris" },
  { value: "BOBIGNY", label: "Bobigny" },
  { value: "CRETEIL", label: "Creteil" },
  { value: "NANTERRE", label: "Nanterre" },
  { value: "VERSAILLES", label: "Versailles" },
  { value: "EVRY_COURCOURONNES", label: "Evry-Courcouronnes" },
  { value: "MELUN", label: "Melun" },
  { value: "PONTOISE", label: "Pontoise" },
] as const;

export const CITY_LABELS = Object.fromEntries(
  CITY_OPTIONS.map((city) => [city.value, city.label]),
) as Record<(typeof CITY_OPTIONS)[number]["value"], string>;

export const ROLE_OPTIONS = [
  { value: "POLICIER", label: "Policier" },
  { value: "AVOCAT", label: "Avocat" },
  { value: "BATONNIER", label: "Batonnier" },
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
  ACCEPTED: "Acceptee",
  UNANSWERED: "Sans reponse",
  CLOSED: "Cloturee",
} as const;

export const ASSIGNMENT_STATUS_LABELS = {
  PENDING: "Notification envoyee",
  ACCEPTED: "Acceptee",
  DECLINED: "Refusee",
  EXPIRED: "Delai depasse",
} as const;

export const DEMO_ACCOUNTS = [
  {
    role: "Batonnier",
    email: "batonnier@demo.fr",
    password: "demo1234",
    note: "Assigne les villes et gere l'ordre de permanence.",
  },
  {
    role: "Policier",
    email: "policier.paris@demo.fr",
    password: "demo1234",
    note: "Peut declarer une nouvelle garde a vue a Paris.",
  },
  {
    role: "Avocat",
    email: "avocat.paris1@demo.fr",
    password: "demo1234",
    note: "Premier avocat de permanence pour Paris.",
  },
] as const;

export const DEFAULT_RESPONSE_WINDOW_MINUTES = 10;
