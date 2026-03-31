import { Role } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decodeCustodyRecordData, readCustodyRecordFile } from "@/lib/custody-records";
import { isVercelDemoStorageMode } from "@/lib/runtime-database";

function getVercelPersistenceError() {
  return NextResponse.json(
    {
      error:
        "Le document n'est pas disponible sur cette instance Vercel. Sans DATABASE_URL persistante, les gardes a vue et leurs PDF peuvent disparaitre entre deux requetes.",
    },
    { status: 503 },
  );
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ alertId: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const { alertId } = await context.params;
  const alert = await prisma.custodyAlert.findUnique({
    where: { id: alertId },
    select: {
      id: true,
      policeOfficerId: true,
      currentLawyerId: true,
      acceptedLawyerId: true,
      custodyRecordFileName: true,
      custodyRecordData: true,
      custodyRecordStoredName: true,
      assignments: {
        where: {
          lawyerId: user.id,
        },
        select: {
          id: true,
        },
        take: 1,
      },
    },
  });

  if (!alert?.custodyRecordFileName) {
    if (isVercelDemoStorageMode()) {
      return getVercelPersistenceError();
    }

    return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
  }

  const hasAccess =
    user.role === Role.BATONNIER ||
    alert.policeOfficerId === user.id ||
    alert.currentLawyerId === user.id ||
    alert.acceptedLawyerId === user.id ||
    alert.assignments.length > 0;

  if (!hasAccess) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  try {
    const file =
      decodeCustodyRecordData(alert.custodyRecordData) ??
      (alert.custodyRecordStoredName
        ? await readCustodyRecordFile(alert.custodyRecordStoredName)
        : null);

    if (!file) {
      if (isVercelDemoStorageMode()) {
        return getVercelPersistenceError();
      }

      return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${alert.custodyRecordFileName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Impossible de lire le document." }, { status: 500 });
  }
}
