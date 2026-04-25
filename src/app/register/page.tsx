import Link from "next/link";

import { registerAction } from "@/app/actions";
import { BrandLockup } from "@/components/brand-lockup";
import { FeedbackBanner } from "@/components/feedback-banner";
import { redirectIfAuthenticated } from "@/lib/auth";
import { CITY_OPTIONS, ROLE_OPTIONS } from "@/lib/constants";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getMessage(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await redirectIfAuthenticated();
  const params = await searchParams;
  const error = getMessage(params.error);

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-[0_35px_120px_rgba(24,18,10,0.18)] lg:grid-cols-[0.95fr_1.05fr]">
        <section className="bg-[linear-gradient(160deg,#221711_0%,#4f3322_45%,#8a5a30_100%)] px-6 py-8 text-white sm:px-10">
          <BrandLockup
            subtitle="Application juridique"
            theme="dark"
            textClassName="text-white"
          />
          <p className="text-sm uppercase tracking-[0.32em] text-amber-100/75">
            Création de compte
          </p>
          <h1 className="mt-4 font-[family-name:var(--font-heading)] text-5xl leading-none">
            Ouvrir un accès par métier.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-8 text-white/76">
            Les policiers choisissent leur ville d&apos;exercice à l&apos;inscription.
            Les avocats peuvent créer leur compte puis attendre l&apos;affectation du
            bâtonnier pour rejoindre une permanence locale.
          </p>
          <div className="mt-10 rounded-[1.6rem] border border-white/10 bg-white/8 p-5">
            <p className="text-sm uppercase tracking-[0.24em] text-amber-100/80">
              Conseil de démonstration
            </p>
            <p className="mt-3 text-sm leading-7 text-white/75">
              Si tu t&apos;inscris en tant qu&apos;avocat, la ville pourra ensuite être
              attribuée depuis l&apos;espace bâtonnier.
            </p>
          </div>
        </section>

        <section className="flex items-center px-6 py-8 sm:px-10">
          <div className="w-full max-w-xl">
            <div className="mb-8 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-700">
                  Profil et rôle
                </p>
                <h2 className="mt-2 font-[family-name:var(--font-heading)] text-4xl text-slate-950">
                  S&apos;inscrire
                </h2>
              </div>
              <Link
                href="/"
                className="rounded-full border border-stone-400 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-950 hover:text-slate-950"
              >
                Retour à l&apos;accueil
              </Link>
            </div>

            <div className="space-y-4">
              <FeedbackBanner message={error} tone="error" />

              <form action={registerAction} className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2 sm:col-span-2">
                  <span className="text-sm font-semibold text-slate-800">
                    Nom complet
                  </span>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full rounded-2xl border border-stone-400 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-slate-950"
                    placeholder="Prénom Nom"
                  />
                </label>

                <label className="block space-y-2 sm:col-span-2">
                  <span className="text-sm font-semibold text-slate-800">Email</span>
                  <input
                    type="email"
                    name="email"
                    required
                    className="w-full rounded-2xl border border-stone-400 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-slate-950"
                    placeholder="nom@barreau.fr"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-slate-800">Rôle</span>
                  <select
                    name="role"
                    defaultValue="POLICIER"
                    className="w-full rounded-2xl border border-stone-400 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-slate-800">
                    Ville
                  </span>
                  <select
                    name="city"
                    defaultValue=""
                    className="w-full rounded-2xl border border-stone-400 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-slate-950"
                  >
                    <option value="">Attribuée plus tard ou non requise</option>
                    {CITY_OPTIONS.map((city) => (
                      <option key={city.value} value={city.value}>
                        {city.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2 sm:col-span-2">
                  <span className="text-sm font-semibold text-slate-800">
                    Mot de passe
                  </span>
                  <input
                    type="password"
                    name="password"
                    required
                    minLength={8}
                    className="w-full rounded-2xl border border-stone-400 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-slate-950"
                    placeholder="8 caractères minimum"
                  />
                </label>

                <button
                  type="submit"
                  className="sm:col-span-2 w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-white transition hover:bg-slate-800"
                >
                  Créer mon compte
                </button>
              </form>
            </div>

            <p className="mt-6 text-sm text-slate-700">
              Déjà inscrit ?{" "}
              <Link href="/login" className="font-semibold text-slate-950">
                Se connecter
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
