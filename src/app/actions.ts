"use server";

import { City, Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  acceptAlert,
  addLawyerToDuty,
  assignLawyerCity,
  closeAlert,
  createCustodyAlert,
  declineAlert,
  markNotificationsAsRead,
  moveDutyAssignment,
  processEscalations,
  removeDutyAssignment,
  updateResponseWindow,
} from "@/lib/alerts";
import {
  clearUserSession,
  createUserSession,
  hashPassword,
  requireRole,
  requireUser,
  verifyPassword,
} from "@/lib/auth";
import { authenticateCredentials } from "@/lib/auth-service";
import { ROLE_ROUTES } from "@/lib/constants";
import {
  prepareCustodyRecordUpload,
  removeCustodyRecordFile,
} from "@/lib/custody-records";
import { prisma } from "@/lib/prisma";

function redirectWithMessage(
  path: string,
  kind: "error" | "success",
  message: string,
): never {
  const params = new URLSearchParams();
  params.set(kind, message);
  redirect(`${path}?${params.toString()}`);
}

const authSchema = z.object({
  email: z.email("Adresse email invalide."),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caracteres."),
});

const registrationSchema = authSchema.extend({
  name: z.string().min(2, "Le nom est trop court.").max(80),
  role: z.nativeEnum(Role),
  city: z.nativeEnum(City).optional().nullable(),
});

export async function loginAction(formData: FormData) {
  const parsed = authSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirectWithMessage("/login", "error", parsed.error.issues[0]?.message ?? "Connexion impossible.");
  }

  let authenticationResult;

  try {
    authenticationResult = await authenticateCredentials(
      {
        email: parsed.data.email,
        password: parsed.data.password,
      },
      {
        findUserByEmail: async (email) =>
          prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              email: true,
              passwordHash: true,
              role: true,
            },
          }),
        verifyPassword,
      },
    );
  } catch (error) {
    console.error("loginAction authentication failure", error);
    redirectWithMessage(
      "/login",
      "error",
      error instanceof Error
        ? `Configuration serveur incomplete: ${error.message}`
        : "Connexion impossible pour cause de configuration serveur.",
    );
  }

  if (!authenticationResult.ok) {
    redirectWithMessage(
      "/login",
      "error",
      authenticationResult.reason === "not_found"
        ? "Compte introuvable."
        : "Mot de passe incorrect.",
    );
  }

  try {
    await createUserSession(
      authenticationResult.user.id,
      authenticationResult.user.role,
    );
  } catch (error) {
    console.error("loginAction session creation failure", error);
    redirectWithMessage(
      "/login",
      "error",
      error instanceof Error
        ? `Configuration serveur incomplete: ${error.message}`
        : "Connexion impossible pour cause de configuration serveur.",
    );
  }

  redirect(ROLE_ROUTES[authenticationResult.user.role]);
}

export async function registerAction(formData: FormData) {
  const parsed = registrationSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    city: formData.get("city") || undefined,
  });

  if (!parsed.success) {
    redirectWithMessage(
      "/register",
      "error",
      parsed.error.issues[0]?.message ?? "Inscription impossible.",
    );
  }

  if (parsed.data.role === Role.POLICIER && !parsed.data.city) {
    redirectWithMessage(
      "/register",
      "error",
      "Un policier doit etre rattache a une ville.",
    );
  }

  let user;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
      select: { id: true },
    });

    if (existingUser) {
      redirectWithMessage(
        "/register",
        "error",
        "Cette adresse email est deja utilisee.",
      );
    }

    user = await prisma.user.create({
      data: {
        name: parsed.data.name.trim(),
        email: parsed.data.email.toLowerCase(),
        passwordHash: await hashPassword(parsed.data.password),
        role: parsed.data.role,
        city: parsed.data.role === Role.POLICIER ? parsed.data.city : null,
      },
    });
  } catch (error) {
    console.error("registerAction persistence failure", error);
    redirectWithMessage(
      "/register",
      "error",
      error instanceof Error
        ? `Configuration serveur incomplete: ${error.message}`
        : "Inscription impossible pour cause de configuration serveur.",
    );
  }

  try {
    await createUserSession(user.id, user.role);
  } catch (error) {
    console.error("registerAction session creation failure", error);
    redirectWithMessage(
      "/register",
      "error",
      error instanceof Error
        ? `Configuration serveur incomplete: ${error.message}`
        : "Inscription impossible pour cause de configuration serveur.",
    );
  }

  redirect(ROLE_ROUTES[user.role]);
}

export async function logoutAction() {
  await clearUserSession();
  redirect("/");
}

const alertSchema = z.object({
  suspectName: z.string().min(2, "Le nom du garde a vue est requis.").max(120),
  policeStation: z.string().min(2, "Le service ou commissariat est requis.").max(120),
  notes: z.string().max(1000).optional(),
});

export async function createAlertAction(formData: FormData) {
  const user = await requireRole(Role.POLICIER);
  const custodyRecordValue = formData.get("custodyRecord");
  const parsed = alertSchema.safeParse({
    suspectName: formData.get("suspectName"),
    policeStation: formData.get("policeStation"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    redirectWithMessage(
      ROLE_ROUTES[user.role],
      "error",
      parsed.error.issues[0]?.message ?? "Impossible de creer l'alerte.",
    );
  }

  if (custodyRecordValue && !(custodyRecordValue instanceof File)) {
    redirectWithMessage(
      ROLE_ROUTES[user.role],
      "error",
      "Le document joint est invalide.",
    );
  }

  let preparedRecord = null;

  try {
    preparedRecord = await prepareCustodyRecordUpload(
      custodyRecordValue instanceof File ? custodyRecordValue : null,
    );

    await createCustodyAlert({
      policeOfficerId: user.id,
      suspectName: parsed.data.suspectName.trim(),
      policeStation: parsed.data.policeStation.trim(),
      notes: parsed.data.notes?.trim(),
      custodyRecord: preparedRecord,
    });
  } catch (error) {
    if (preparedRecord?.storedName) {
      await removeCustodyRecordFile(preparedRecord.storedName);
    }

    redirectWithMessage(
      ROLE_ROUTES[user.role],
      "error",
      error instanceof Error ? error.message : "Impossible de creer l'alerte.",
    );
  }

  redirectWithMessage(
    ROLE_ROUTES[user.role],
    "success",
    "La garde a vue a bien ete transmise a la permanence.",
  );
}

const alertIdSchema = z.object({
  alertId: z.string().min(1),
});

export async function acceptAlertAction(formData: FormData) {
  const user = await requireRole(Role.AVOCAT);
  const parsed = alertIdSchema.safeParse({
    alertId: formData.get("alertId"),
  });

  if (!parsed.success) {
    redirectWithMessage(ROLE_ROUTES[user.role], "error", "Alerte invalide.");
  }

  try {
    await processEscalations();
    await acceptAlert(parsed.data.alertId, user.id);
  } catch (error) {
    redirectWithMessage(
      ROLE_ROUTES[user.role],
      "error",
      error instanceof Error ? error.message : "Impossible d'accepter l'alerte.",
    );
  }

  redirectWithMessage(
    ROLE_ROUTES[user.role],
    "success",
    "La garde a vue vous est desormais attribuee.",
  );
}

export async function declineAlertAction(formData: FormData) {
  const user = await requireRole(Role.AVOCAT);
  const parsed = alertIdSchema.safeParse({
    alertId: formData.get("alertId"),
  });

  if (!parsed.success) {
    redirectWithMessage(ROLE_ROUTES[user.role], "error", "Alerte invalide.");
  }

  try {
    await processEscalations();
    await declineAlert(parsed.data.alertId, user.id);
  } catch (error) {
    redirectWithMessage(
      ROLE_ROUTES[user.role],
      "error",
      error instanceof Error ? error.message : "Impossible de refuser l'alerte.",
    );
  }

  redirectWithMessage(
    ROLE_ROUTES[user.role],
    "success",
    "La demande a ete transmise a l'avocat suivant.",
  );
}

export async function closeAlertAction(formData: FormData) {
  const user = await requireRole(Role.POLICIER);
  const parsed = alertIdSchema.safeParse({
    alertId: formData.get("alertId"),
  });

  if (!parsed.success) {
    redirectWithMessage(ROLE_ROUTES[user.role], "error", "Alerte invalide.");
  }

  await closeAlert(parsed.data.alertId, user.id);
  redirectWithMessage(
    ROLE_ROUTES[user.role],
    "success",
    "Le dossier a ete cloture.",
  );
}

const lawyerCitySchema = z.object({
  lawyerId: z.string().min(1),
  city: z.nativeEnum(City),
});

export async function assignLawyerCityAction(formData: FormData) {
  const user = await requireRole(Role.BATONNIER);
  const parsed = lawyerCitySchema.safeParse({
    lawyerId: formData.get("lawyerId"),
    city: formData.get("city"),
  });

  if (!parsed.success) {
    redirectWithMessage(ROLE_ROUTES[user.role], "error", "Affectation invalide.");
  }

  try {
    await assignLawyerCity(parsed.data.lawyerId, parsed.data.city, user.id);
  } catch (error) {
    redirectWithMessage(
      ROLE_ROUTES[user.role],
      "error",
      error instanceof Error ? error.message : "Impossible de modifier la ville.",
    );
  }

  redirectWithMessage(
    ROLE_ROUTES[user.role],
    "success",
    "La ville de l'avocat a bien ete mise a jour.",
  );
}

export async function addLawyerToDutyAction(formData: FormData) {
  const user = await requireRole(Role.BATONNIER);
  const parsed = lawyerCitySchema.safeParse({
    lawyerId: formData.get("lawyerId"),
    city: formData.get("city"),
  });

  if (!parsed.success) {
    redirectWithMessage(ROLE_ROUTES[user.role], "error", "Permanence invalide.");
  }

  try {
    await addLawyerToDuty(parsed.data.lawyerId, parsed.data.city, user.id);
  } catch (error) {
    redirectWithMessage(
      ROLE_ROUTES[user.role],
      "error",
      error instanceof Error ? error.message : "Impossible d'ajouter l'avocat a la permanence.",
    );
  }

  redirectWithMessage(
    ROLE_ROUTES[user.role],
    "success",
    "L'avocat a ete ajoute a la permanence.",
  );
}

const moveDutySchema = z.object({
  assignmentId: z.string().min(1),
});

export async function moveDutyUpAction(formData: FormData) {
  const user = await requireRole(Role.BATONNIER);
  const parsed = moveDutySchema.safeParse({
    assignmentId: formData.get("assignmentId"),
  });

  if (!parsed.success) {
    redirectWithMessage(ROLE_ROUTES[user.role], "error", "Affectation invalide.");
  }

  await moveDutyAssignment(parsed.data.assignmentId, "up");
  redirect(ROLE_ROUTES[user.role]);
}

export async function moveDutyDownAction(formData: FormData) {
  const user = await requireRole(Role.BATONNIER);
  const parsed = moveDutySchema.safeParse({
    assignmentId: formData.get("assignmentId"),
  });

  if (!parsed.success) {
    redirectWithMessage(ROLE_ROUTES[user.role], "error", "Affectation invalide.");
  }

  await moveDutyAssignment(parsed.data.assignmentId, "down");
  redirect(ROLE_ROUTES[user.role]);
}

export async function removeDutyAssignmentAction(formData: FormData) {
  const user = await requireRole(Role.BATONNIER);
  const parsed = moveDutySchema.safeParse({
    assignmentId: formData.get("assignmentId"),
  });

  if (!parsed.success) {
    redirectWithMessage(ROLE_ROUTES[user.role], "error", "Affectation invalide.");
  }

  await removeDutyAssignment(parsed.data.assignmentId);
  redirectWithMessage(
    ROLE_ROUTES[user.role],
    "success",
    "L'avocat a ete retire de la permanence.",
  );
}

const responseWindowSchema = z.object({
  city: z.nativeEnum(City),
  responseWindowMinutes: z.coerce
    .number()
    .int()
    .min(1, "Le delai doit etre d'au moins 1 minute.")
    .max(120, "Le delai ne peut pas depasser 120 minutes."),
});

export async function updateResponseWindowAction(formData: FormData) {
  const user = await requireRole(Role.BATONNIER);
  const parsed = responseWindowSchema.safeParse({
    city: formData.get("city"),
    responseWindowMinutes: formData.get("responseWindowMinutes"),
  });

  if (!parsed.success) {
    redirectWithMessage(
      ROLE_ROUTES[user.role],
      "error",
      parsed.error.issues[0]?.message ?? "Configuration invalide.",
    );
  }

  await updateResponseWindow(
    parsed.data.city,
    parsed.data.responseWindowMinutes,
    user.id,
  );

  redirectWithMessage(
    ROLE_ROUTES[user.role],
    "success",
    "Le delai de reponse a ete mis a jour.",
  );
}

export async function markNotificationsReadAction(formData: FormData) {
  const user = await requireUser();
  const returnTo = String(formData.get("returnTo") || ROLE_ROUTES[user.role]);

  await markNotificationsAsRead(user.id);
  redirect(returnTo);
}
