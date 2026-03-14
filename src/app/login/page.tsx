import Link from "next/link";

import { FeedbackBanner } from "@/components/feedback-banner";
import { loginAction } from "@/app/actions";
import { redirectIfAuthenticated } from "@/lib/auth";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getMessage(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({
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
        <section className="bg-[linear-gradient(160deg,#111827_0%,#14324c_42%,#1f5c52_100%)] px-6 py-8 text-white sm:px-10">
          <p className="text-sm uppercase tracking-[0.32em] text-amber-100/75">
            Connexion
          </p>
          <h1 className="mt-4 font-[family-name:var(--font-heading)] text-5xl leading-none">
            Reprendre la permanence.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-8 text-white/76">
            Connecte-toi pour retrouver ton espace metier, recevoir les
            notifications en cours et suivre l&apos;escalade des gardes a vue sur ta
            ville.
          </p>
          <div className="mt-10 rounded-[1.6rem] border border-white/10 bg-white/8 p-5">
            <p className="text-sm uppercase tracking-[0.24em] text-emerald-100/80">
              Acces rapide
            </p>
            <p className="mt-3 text-sm leading-7 text-white/75">
              Utilise par exemple `batonnier@demo.fr` ou `policier.paris@demo.fr`
              avec le mot de passe `demo1234`.
            </p>
          </div>
        </section>

        <section className="flex items-center px-6 py-8 sm:px-10">
          <div className="w-full max-w-xl">
            <div className="mb-8 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-700">
                  Identification securisee
                </p>
                <h2 className="mt-2 font-[family-name:var(--font-heading)] text-4xl text-slate-950">
                  Se connecter
                </h2>
              </div>
              <Link
                href="/"
                className="rounded-full border border-stone-400 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-950 hover:text-slate-950"
              >
                Retour accueil
              </Link>
            </div>

            <div className="space-y-4">
              <FeedbackBanner message={error} tone="error" />

              <form action={loginAction} className="space-y-4">
                <label className="block space-y-2">
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
                  <span className="text-sm font-semibold text-slate-800">
                    Mot de passe
                  </span>
                  <input
                    type="password"
                    name="password"
                    required
                    minLength={8}
                    className="w-full rounded-2xl border border-stone-400 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-slate-950"
                    placeholder="8 caracteres minimum"
                  />
                </label>

                <button
                  type="submit"
                  className="w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-white transition hover:bg-slate-800"
                >
                  Ouvrir mon espace
                </button>
              </form>
            </div>

            <p className="mt-6 text-sm text-slate-700">
              Pas encore de compte ?{" "}
              <Link href="/register" className="font-semibold text-slate-950">
                Creer un acces
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
