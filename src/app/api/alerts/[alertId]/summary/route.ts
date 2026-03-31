import { Role } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import {
  enhanceCustodyAlertSummary,
  getCustodyRecordSummaryState,
} from "@/lib/custody-records";
import { prisma } from "@/lib/prisma";

async function getAuthorizedAlertForSummary(alertId: string, userId: string, role: Role) {
  const alert = await prisma.custodyAlert.findUnique({
    where: { id: alertId },
    select: {
      id: true,
      policeOfficerId: true,
      currentLawyerId: true,
      acceptedLawyerId: true,
      custodyRecordSummary: true,
      custodyRecordExtract: true,
      assignments: {
        where: {
          lawyerId: userId,
        },
        select: {
          id: true,
        },
        take: 1,
      },
    },
  });

  if (!alert) {
    return {
      response: NextResponse.json({ error: "Alerte introuvable." }, { status: 404 }),
    };
  }

  const hasAccess =
    role === Role.BATONNIER ||
    alert.policeOfficerId === userId ||
    alert.currentLawyerId === userId ||
    alert.acceptedLawyerId === userId ||
    alert.assignments.length > 0;

  if (!hasAccess) {
    return {
      response: NextResponse.json({ error: "Acces refuse." }, { status: 403 }),
    };
  }

  return { alert };
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
  const result = await getAuthorizedAlertForSummary(alertId, user.id, user.role);

  if ("response" in result) {
    return result.response;
  }

  const summaryState = getCustodyRecordSummaryState({
    extractedText: result.alert.custodyRecordExtract,
    summary: result.alert.custodyRecordSummary,
  });

  return NextResponse.json({
    pendingGeminiSummary: summaryState.pendingGeminiSummary,
    source: summaryState.source,
    summary: result.alert.custodyRecordSummary,
  });
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ alertId: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const { alertId } = await context.params;
  const result = await getAuthorizedAlertForSummary(alertId, user.id, user.role);

  if ("response" in result) {
    return result.response;
  }

  const summary = await enhanceCustodyAlertSummary(alertId);
  const summaryState = getCustodyRecordSummaryState({
    extractedText: result.alert.custodyRecordExtract,
    summary: summary ?? result.alert.custodyRecordSummary,
  });

  return NextResponse.json({
    pendingGeminiSummary: summaryState.pendingGeminiSummary,
    source: summaryState.source,
    summary: summary ?? result.alert.custodyRecordSummary,
  });
}
