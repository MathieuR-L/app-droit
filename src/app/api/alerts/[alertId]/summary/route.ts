import { Role } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import {
  enhanceCustodyAlertSummary,
  getCustodyRecordSummaryState,
  getRenderableCustodyRecordSummary,
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
      custodyRecordFileName: true,
      custodyRecordSummary: true,
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
    fileName: result.alert.custodyRecordFileName,
    summary: result.alert.custodyRecordSummary,
  });

  return NextResponse.json({
    pendingGeminiSummary: summaryState.pendingGeminiSummary,
    source: summaryState.source,
    summary: getRenderableCustodyRecordSummary(result.alert.custodyRecordSummary),
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

  const encoder = new TextEncoder();
  const summaryState = getCustodyRecordSummaryState({
    fileName: result.alert.custodyRecordFileName,
    summary: result.alert.custodyRecordSummary,
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let streamedAnyChunk = false;

      try {
        const existingSummary = getRenderableCustodyRecordSummary(
          result.alert.custodyRecordSummary,
        );

        if (existingSummary && !summaryState.canEnhanceWithGemini) {
          controller.enqueue(encoder.encode(existingSummary));
          return;
        }

        await enhanceCustodyAlertSummary(alertId, {
          onChunk: (chunk) => {
            streamedAnyChunk = true;
            controller.enqueue(encoder.encode(chunk));
          },
        });

        if (!streamedAnyChunk) {
          controller.enqueue(
            encoder.encode(
              "Gemini n'a pas encore pu produire de resume. Le PDF original reste disponible.",
            ),
          );
        }
      } catch (error) {
        console.error("Gemini PDF summary streaming failed", error);
        controller.enqueue(
          encoder.encode(
            "Gemini n'a pas pu produire de resume pour l'instant. Le PDF original reste disponible.",
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
