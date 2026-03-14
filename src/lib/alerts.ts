import {
  AlertStatus,
  AssignmentStatus,
  City,
  NotificationType,
  Prisma,
  Role,
} from "@prisma/client";

import { DEFAULT_RESPONSE_WINDOW_MINUTES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { addMinutes, formatRelativeMinutes } from "@/lib/utils";

type Tx = Prisma.TransactionClient;

function buildReference() {
  const date = new Intl.DateTimeFormat("fr-CA").format(new Date()).replaceAll("-", "");
  const suffix = crypto.randomUUID().slice(0, 6).toUpperCase();

  return `GAV-${date}-${suffix}`;
}

async function getResponseWindowMinutes(tx: Tx, city: City) {
  const setting = await tx.responseSetting.findUnique({
    where: { city },
    select: { responseWindowMinutes: true },
  });

  return setting?.responseWindowMinutes ?? DEFAULT_RESPONSE_WINDOW_MINUTES;
}

async function normalizeDutyOrder(tx: Tx, city: City) {
  const assignments = await tx.dutyAssignment.findMany({
    where: { city },
    orderBy: { priority: "asc" },
    select: { id: true },
  });

  for (const [index, assignment] of assignments.entries()) {
    await tx.dutyAssignment.update({
      where: { id: assignment.id },
      data: { priority: index + 1 },
    });
  }
}

async function notifyBatonniers(
  tx: Tx,
  title: string,
  message: string,
  alertId?: string,
) {
  const batonniers = await tx.user.findMany({
    where: { role: Role.BATONNIER },
    select: { id: true },
  });

  if (!batonniers.length) {
    return;
  }

  await tx.notification.createMany({
    data: batonniers.map((batonnier) => ({
      userId: batonnier.id,
      alertId,
      title,
      message,
      type: NotificationType.SYSTEM,
    })),
  });
}

async function assignNextLawyer(
  tx: Tx,
  params: {
    alertId: string;
    city: City;
    afterPriority: number;
    now?: Date;
  },
) {
  const now = params.now ?? new Date();
  const alert = await tx.custodyAlert.findUnique({
    where: { id: params.alertId },
    select: {
      id: true,
      reference: true,
      city: true,
      policeOfficerId: true,
      custodyRecordFileName: true,
      custodyRecordSummary: true,
    },
  });

  if (!alert) {
    return null;
  }

  const nextDuty = await tx.dutyAssignment.findFirst({
    where: {
      city: params.city,
      active: true,
      priority: { gt: params.afterPriority },
      lawyer: {
        is: {
          role: Role.AVOCAT,
          city: params.city,
        },
      },
    },
    include: {
      lawyer: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { priority: "asc" },
  });

  if (!nextDuty) {
    await tx.custodyAlert.update({
      where: { id: params.alertId },
      data: {
        status: AlertStatus.UNANSWERED,
        currentLawyerId: null,
        currentAssignmentOrder: null,
        responseDeadline: null,
      },
    });

    await tx.notification.create({
      data: {
        userId: alert.policeOfficerId,
        alertId: alert.id,
        title: `Aucun avocat disponible pour ${alert.reference}`,
        message:
          "Tous les avocats de permanence de cette ville ont ete contactes sans reponse.",
        type: NotificationType.SYSTEM,
      },
    });

    await notifyBatonniers(
      tx,
      `Escalade terminee pour ${alert.reference}`,
      "Plus aucun avocat de permanence n'est disponible sur cette ville.",
      alert.id,
    );

    return null;
  }

  const responseWindowMinutes = await getResponseWindowMinutes(tx, params.city);
  const deadline = addMinutes(now, responseWindowMinutes);
  const escalated = params.afterPriority > 0;

  await tx.alertAssignment.create({
    data: {
      alertId: alert.id,
      lawyerId: nextDuty.lawyerId,
      priority: nextDuty.priority,
      responseDeadline: deadline,
    },
  });

  await tx.custodyAlert.update({
    where: { id: alert.id },
    data: {
      status: AlertStatus.PENDING,
      currentLawyerId: nextDuty.lawyerId,
      currentAssignmentOrder: nextDuty.priority,
      responseDeadline: deadline,
    },
  });

  await tx.notification.create({
    data: {
      userId: nextDuty.lawyerId,
      alertId: alert.id,
      title: escalated
        ? `Escalade de garde a vue ${alert.reference}`
        : `Nouvelle garde a vue ${alert.reference}`,
      message: `Vous etes sollicite en priorite ${nextDuty.priority}. Reponse attendue sous ${formatRelativeMinutes(responseWindowMinutes)}.${alert.custodyRecordFileName ? " Un PDF de garde a vue et un resume automatique sont disponibles." : ""}`,
      type: escalated ? NotificationType.ESCALATED : NotificationType.NEW_ALERT,
    },
  });

  await tx.notification.create({
    data: {
      userId: alert.policeOfficerId,
      alertId: alert.id,
      title: escalated
        ? `Escalade en cours pour ${alert.reference}`
        : `Alerte transmise pour ${alert.reference}`,
      message: escalated
        ? `${nextDuty.lawyer.name} a ete notifie apres expiration du delai precedent.`
        : `${nextDuty.lawyer.name} a ete notifie en premiere intention.`,
      type: escalated ? NotificationType.ESCALATED : NotificationType.NEW_ALERT,
    },
  });

  return nextDuty;
}

export async function processEscalations() {
  const now = new Date();
  const expiredAssignments = await prisma.alertAssignment.findMany({
    where: {
      status: AssignmentStatus.PENDING,
      responseDeadline: { lte: now },
      alert: {
        status: AlertStatus.PENDING,
      },
    },
    select: { id: true },
    orderBy: { responseDeadline: "asc" },
  });

  for (const expiredAssignment of expiredAssignments) {
    await prisma.$transaction(async (tx) => {
      const assignment = await tx.alertAssignment.findUnique({
        where: { id: expiredAssignment.id },
        include: {
          alert: {
            select: {
              id: true,
              reference: true,
              city: true,
              status: true,
            },
          },
          lawyer: {
            select: {
              name: true,
            },
          },
        },
      });

      if (
        !assignment ||
        assignment.status !== AssignmentStatus.PENDING ||
        assignment.alert.status !== AlertStatus.PENDING ||
        assignment.responseDeadline > now
      ) {
        return;
      }

      await tx.alertAssignment.update({
        where: { id: assignment.id },
        data: {
          status: AssignmentStatus.EXPIRED,
          respondedAt: now,
        },
      });

      await assignNextLawyer(tx, {
        alertId: assignment.alert.id,
        city: assignment.alert.city,
        afterPriority: assignment.priority,
        now,
      });
    });
  }
}

export async function createCustodyAlert(input: {
  policeOfficerId: string;
  suspectName: string;
  policeStation: string;
  notes?: string;
  custodyRecord?: {
    fileName: string;
    storedName: string;
    mimeType: string;
    extractedText: string | null;
    summary: string;
    pageCount: number | null;
    uploadedAt: Date;
  } | null;
}) {
  return prisma.$transaction(async (tx) => {
    const policeOfficer = await tx.user.findUnique({
      where: { id: input.policeOfficerId },
      select: {
        id: true,
        role: true,
        city: true,
      },
    });

    if (
      !policeOfficer ||
      policeOfficer.role !== Role.POLICIER ||
      !policeOfficer.city
    ) {
      throw new Error(
        "Le policier doit etre rattache a une ville avant de creer une garde a vue.",
      );
    }

    const alert = await tx.custodyAlert.create({
      data: {
        reference: buildReference(),
        suspectName: input.suspectName,
        policeStation: input.policeStation,
        notes: input.notes?.trim() || null,
        custodyRecordFileName: input.custodyRecord?.fileName ?? null,
        custodyRecordStoredName: input.custodyRecord?.storedName ?? null,
        custodyRecordMimeType: input.custodyRecord?.mimeType ?? null,
        custodyRecordExtract: input.custodyRecord?.extractedText ?? null,
        custodyRecordSummary: input.custodyRecord?.summary ?? null,
        custodyRecordPageCount: input.custodyRecord?.pageCount ?? null,
        custodyRecordUploadedAt: input.custodyRecord?.uploadedAt ?? null,
        city: policeOfficer.city,
        policeOfficerId: policeOfficer.id,
      },
      select: { id: true },
    });

    await assignNextLawyer(tx, {
      alertId: alert.id,
      city: policeOfficer.city,
      afterPriority: 0,
    });

    return alert.id;
  });
}

export async function acceptAlert(alertId: string, lawyerId: string) {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const assignment = await tx.alertAssignment.findFirst({
      where: {
        alertId,
        lawyerId,
        status: AssignmentStatus.PENDING,
      },
      include: {
        alert: {
          select: {
            id: true,
            reference: true,
            policeOfficerId: true,
            status: true,
          },
        },
        lawyer: {
          select: {
            name: true,
          },
        },
      },
    });

    if (
      !assignment ||
      assignment.alert.status !== AlertStatus.PENDING ||
      assignment.responseDeadline <= now
    ) {
      throw new Error("Cette garde a vue n'est plus disponible.");
    }

    await tx.alertAssignment.update({
      where: { id: assignment.id },
      data: {
        status: AssignmentStatus.ACCEPTED,
        respondedAt: now,
      },
    });

    await tx.custodyAlert.update({
      where: { id: alertId },
      data: {
        status: AlertStatus.ACCEPTED,
        acceptedAt: now,
        acceptedLawyerId: lawyerId,
        currentLawyerId: lawyerId,
        responseDeadline: null,
      },
    });

    await tx.notification.create({
      data: {
        userId: assignment.alert.policeOfficerId,
        alertId,
        title: `${assignment.lawyer.name} accepte ${assignment.alert.reference}`,
        message:
          "L'avocat de permanence a accepte la mission et peut desormais etre contacte.",
        type: NotificationType.ALERT_ACCEPTED,
      },
    });
  });
}

export async function declineAlert(alertId: string, lawyerId: string) {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const assignment = await tx.alertAssignment.findFirst({
      where: {
        alertId,
        lawyerId,
        status: AssignmentStatus.PENDING,
      },
      include: {
        alert: {
          select: {
            id: true,
            reference: true,
            city: true,
            policeOfficerId: true,
            status: true,
          },
        },
        lawyer: {
          select: {
            name: true,
          },
        },
      },
    });

    if (
      !assignment ||
      assignment.alert.status !== AlertStatus.PENDING ||
      assignment.responseDeadline <= now
    ) {
      throw new Error("Cette garde a vue n'est plus disponible.");
    }

    await tx.alertAssignment.update({
      where: { id: assignment.id },
      data: {
        status: AssignmentStatus.DECLINED,
        respondedAt: now,
      },
    });

    await tx.notification.create({
      data: {
        userId: assignment.alert.policeOfficerId,
        alertId,
        title: `${assignment.lawyer.name} a refuse ${assignment.alert.reference}`,
        message:
          "La demande est automatiquement transmise a l'avocat suivant de la permanence.",
        type: NotificationType.ALERT_DECLINED,
      },
    });

    await assignNextLawyer(tx, {
      alertId: assignment.alert.id,
      city: assignment.alert.city,
      afterPriority: assignment.priority,
      now,
    });
  });
}

export async function closeAlert(alertId: string, policeOfficerId: string) {
  return prisma.custodyAlert.updateMany({
    where: {
      id: alertId,
      policeOfficerId,
    },
    data: {
      status: AlertStatus.CLOSED,
      responseDeadline: null,
    },
  });
}

export async function assignLawyerCity(
  lawyerId: string,
  city: City,
  batonnierId: string,
) {
  return prisma.$transaction(async (tx) => {
    const lawyer = await tx.user.findUnique({
      where: { id: lawyerId },
      select: {
        id: true,
        name: true,
        role: true,
        city: true,
      },
    });

    if (!lawyer || lawyer.role !== Role.AVOCAT) {
      throw new Error("Utilisateur avocat introuvable.");
    }

    const previousCities = await tx.dutyAssignment.findMany({
      where: { lawyerId },
      select: { city: true },
      distinct: ["city"],
    });

    await tx.dutyAssignment.deleteMany({
      where: { lawyerId },
    });

    await tx.user.update({
      where: { id: lawyerId },
      data: { city },
    });

    for (const previousCity of previousCities) {
      await normalizeDutyOrder(tx, previousCity.city);
    }

    await tx.notification.create({
      data: {
        userId: lawyerId,
        title: "Ville d'intervention mise a jour",
        message: `Le batonnier vous a rattache a la ville ${city}.`,
        type: NotificationType.SYSTEM,
      },
    });

    await tx.responseSetting.upsert({
      where: { city },
      create: {
        city,
        responseWindowMinutes: DEFAULT_RESPONSE_WINDOW_MINUTES,
        updatedById: batonnierId,
      },
      update: {
        updatedById: batonnierId,
      },
    });
  });
}

export async function addLawyerToDuty(
  lawyerId: string,
  city: City,
  batonnierId: string,
) {
  return prisma.$transaction(async (tx) => {
    const lawyer = await tx.user.findUnique({
      where: { id: lawyerId },
      select: {
        id: true,
        role: true,
        city: true,
      },
    });

    if (!lawyer || lawyer.role !== Role.AVOCAT) {
      throw new Error("Seuls les avocats peuvent etre affectes a une permanence.");
    }

    if (lawyer.city !== city) {
      throw new Error(
        "L'avocat doit d'abord etre rattache a la meme ville avant d'etre ajoute a la permanence.",
      );
    }

    const existing = await tx.dutyAssignment.findUnique({
      where: {
        city_lawyerId: {
          city,
          lawyerId,
        },
      },
      select: { id: true },
    });

    if (existing) {
      return existing;
    }

    const currentCount = await tx.dutyAssignment.count({
      where: { city },
    });

    return tx.dutyAssignment.create({
      data: {
        city,
        lawyerId,
        assignedById: batonnierId,
        priority: currentCount + 1,
      },
    });
  });
}

export async function moveDutyAssignment(
  assignmentId: string,
  direction: "up" | "down",
) {
  return prisma.$transaction(async (tx) => {
    const assignment = await tx.dutyAssignment.findUnique({
      where: { id: assignmentId },
      select: {
        id: true,
        city: true,
        priority: true,
      },
    });

    if (!assignment) {
      throw new Error("Affectation introuvable.");
    }

    const neighborPriority =
      direction === "up" ? assignment.priority - 1 : assignment.priority + 1;

    if (neighborPriority < 1) {
      return;
    }

    const neighbor = await tx.dutyAssignment.findUnique({
      where: {
        city_priority: {
          city: assignment.city,
          priority: neighborPriority,
        },
      },
      select: { id: true },
    });

    if (!neighbor) {
      return;
    }

    await tx.dutyAssignment.update({
      where: { id: assignment.id },
      data: { priority: 0 },
    });

    await tx.dutyAssignment.update({
      where: { id: neighbor.id },
      data: { priority: assignment.priority },
    });

    await tx.dutyAssignment.update({
      where: { id: assignment.id },
      data: { priority: neighborPriority },
    });
  });
}

export async function removeDutyAssignment(assignmentId: string) {
  return prisma.$transaction(async (tx) => {
    const assignment = await tx.dutyAssignment.findUnique({
      where: { id: assignmentId },
      select: {
        city: true,
        lawyerId: true,
      },
    });

    if (!assignment) {
      return;
    }

    await tx.dutyAssignment.delete({
      where: { id: assignmentId },
    });

    await normalizeDutyOrder(tx, assignment.city);

    await tx.notification.create({
      data: {
        userId: assignment.lawyerId,
        title: "Retrait de la permanence",
        message: `Vous n'etes plus de permanence pour la ville ${assignment.city}.`,
        type: NotificationType.SYSTEM,
      },
    });
  });
}

export async function updateResponseWindow(
  city: City,
  responseWindowMinutes: number,
  batonnierId: string,
) {
  return prisma.responseSetting.upsert({
    where: { city },
    create: {
      city,
      responseWindowMinutes,
      updatedById: batonnierId,
    },
    update: {
      responseWindowMinutes,
      updatedById: batonnierId,
    },
  });
}

export async function markNotificationsAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: {
      userId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });
}
