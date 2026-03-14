import Link from "next/link";

import { getCurrentUser } from "@/lib/auth";
import { DEMO_ACCOUNTS, ROLE_ROUTES } from "@/lib/constants";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl flex-col overflow-hidden rounded-[2rem] bg-[linear-gradient(140deg,#101829_0%,#10243e_38%,#1f4d4a_100%)] text-white shadow-[0_35px_120px_rgba(24,18,10,0.25)]">
        <header className="flex flex-col gap-4 border-b border-white/10 px-6 py-6 sm:px-10 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-amber-100/80">
              Application juridique
            </p>
            <h1 className="font-[family-name:var(--font-heading)] text-4xl sm:text-5xl">
              la gavance
            </h1>
          </div>

          <div className="flex flex-wrap gap-3">
            {user ? (
              <Link
                href={ROLE_ROUTES[user.role]}
                className="rounded-full bg-amber-200 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white"
              >
                Revenir a mon tableau de bord
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold transition hover:bg-white/10"
                >
                  Se connecter
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-amber-200 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white"
                >
                  Creer un compte
                </Link>
              </>
            )}
          </div>
        </header>

        <div className="grid flex-1 gap-8 px-6 py-8 sm:px-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <section className="space-y-8">
            <div className="space-y-6">
              <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm uppercase tracking-[0.28em] text-emerald-100">
                Signalement, notification, escalation
              </div>
              <div className="space-y-4">
                <h2 className="max-w-4xl font-[family-name:var(--font-heading)] text-5xl leading-none sm:text-6xl">
                  Une chaine de permanence claire entre police, avocat et batonnier.
                </h2>
                <p className="max-w-2xl text-base leading-8 text-white/78 sm:text-lg">
                  Lorsqu&apos;une nouvelle garde a vue est declaree, l&apos;application
                  notifie automatiquement l&apos;avocat de permanence de la meme ville.
                  Si le delai configure expire, la demande est escaladee vers le
                  suivant sans intervention manuelle.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <article className="rounded-[1.6rem] border border-white/12 bg-white/8 p-5 backdrop-blur-sm">
                <p className="text-sm uppercase tracking-[0.28em] text-amber-100/75">
                  Policier
                </p>
                <p className="mt-3 text-sm leading-7 text-white/75">
                  Cree une alerte depuis sa ville, suit l&apos;etat du dossier et voit
                  quel avocat a ete contacte.
                </p>
              </article>
              <article className="rounded-[1.6rem] border border-white/12 bg-white/8 p-5 backdrop-blur-sm">
                <p className="text-sm uppercase tracking-[0.28em] text-emerald-100/75">
                  Avocat
                </p>
                <p className="mt-3 text-sm leading-7 text-white/75">
                  Recoit les notifications, accepte ou refuse dans le delai imparti,
                  puis suit son historique d&apos;interventions.
                </p>
              </article>
              <article className="rounded-[1.6rem] border border-white/12 bg-white/8 p-5 backdrop-blur-sm">
                <p className="text-sm uppercase tracking-[0.28em] text-sky-100/75">
                  Batonnier
                </p>
                <p className="mt-3 text-sm leading-7 text-white/75">
                  Attribue les villes aux avocats, regle les delais de reponse et
                  compose l&apos;ordre de permanence par ville.
                </p>
              </article>
            </div>
          </section>

          <aside className="rounded-[2rem] border border-white/10 bg-white/9 p-6 backdrop-blur-md">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-white/60">
                  Comptes de demonstration
                </p>
                <h3 className="mt-2 font-[family-name:var(--font-heading)] text-3xl">
                  Parcours complet deja precharge
                </h3>
              </div>
              <div className="rounded-full bg-white/10 px-3 py-2 text-xs uppercase tracking-[0.2em] text-amber-100">
                Mot de passe unique
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {DEMO_ACCOUNTS.map((account) => (
                <article
                  key={account.email}
                  className="rounded-[1.4rem] border border-white/10 bg-slate-950/25 p-4"
                >
                  <p className="text-xs uppercase tracking-[0.24em] text-amber-100/80">
                    {account.role}
                  </p>
                  <p className="mt-2 text-sm font-semibold">{account.email}</p>
                  <p className="mt-1 text-sm text-white/70">
                    Mot de passe: {account.password}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-white/72">
                    {account.note}
                  </p>
                </article>
              ))}
            </div>

            <p className="mt-6 text-sm leading-7 text-white/65">
              Des villes d&apos;Ile-de-France sont deja configurees pour illustrer les
              affectations: Paris, Bobigny, Creteil, Nanterre et d&apos;autres villes
              peuvent etre actives par le batonnier.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
