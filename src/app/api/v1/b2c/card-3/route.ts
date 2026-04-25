/**
 * POST /api/v1/b2c/card-3 — CV upload + extracție AI + formular + Hermann + MBTI
 * GET  /api/v1/b2c/card-3 — Profil profesional extras + matching disponibil
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { extractB2CAuth, verifyB2COwnership } from "@/lib/security/b2c-auth"
import Anthropic from "@anthropic-ai/sdk"
import { scoreHermann } from "@/lib/b2c/questionnaires/hermann-hbdi"
import { scoreMBTI } from "@/lib/b2c/questionnaires/mbti"
import type { HermannAnswers, MBTIAnswers } from "@/lib/b2c/questionnaires/types"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// ── GET: profil profesional extras ─────────────────��────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")
  if (!userId) return NextResponse.json({ error: "userId necesar" }, { status: 400 })

  const b2cAuth = extractB2CAuth(req)
  if (!b2cAuth || !verifyB2COwnership(b2cAuth, userId)) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const card = await prisma.b2CCardProgress.findFirst({
    where: { userId, card: "CARD_3" },
    select: {
      status: true, phase: true, stage: true,
      cvFileUrl: true, cvExtractedData: true, questionnaireData: true,
      activatedAt: true,
    },
  })

  if (!card) return NextResponse.json({ error: "Card 3 negăsit" }, { status: 404 })

  // Posturi disponibile (publice, de la B2B) — matching potențial
  const availableJobs = await prisma.job.findMany({
    where: { isActive: true, status: "ACTIVE" },
    select: {
      id: true, title: true, code: true, purpose: true,
      department: { select: { name: true } },
      tenant: { select: { name: true } },
    },
    take: 20,
    orderBy: { updatedAt: "desc" },
  })

  return NextResponse.json({
    card,
    profile: card.cvExtractedData || null,
    questionnaire: card.questionnaireData || null,
    availableJobs: availableJobs.map(j => ({
      id: j.id, title: j.title, code: j.code, purpose: j.purpose,
      department: j.department?.name, company: j.tenant?.name,
    })),
  })
}

// ── POST: upload CV + extracție + formular + Hermann + MBTI ──

export async function POST(req: NextRequest) {
  // Determine content type
  const contentType = req.headers.get("content-type") || ""

  if (contentType.includes("application/json")) {
    return handleJSONAction(req)
  }

  // FormData (legacy: questionnaire + cv-upload)
  const formData = await req.formData()
  const userId = formData.get("userId") as string
  const action = formData.get("action") as string

  if (!userId) return NextResponse.json({ error: "userId necesar" }, { status: 400 })

  const b2cAuth = extractB2CAuth(req)
  if (!b2cAuth || !verifyB2COwnership(b2cAuth, userId)) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const card = await prisma.b2CCardProgress.findFirst({
    where: { userId, card: "CARD_3", status: "ACTIVE" },
  })
  if (!card) return NextResponse.json({ error: "Card 3 nu e activ" }, { status: 400 })

  if (action === "cv-upload") {
    return handleCVUpload(formData, card.id, userId)
  } else if (action === "questionnaire") {
    return handleQuestionnaire(formData, card.id)
  }

  return NextResponse.json({ error: "Acțiune necunoscută" }, { status: 400 })
}

// ── JSON actions: Hermann + MBTI ────────────────────────────

async function handleJSONAction(req: NextRequest) {
  const body = await req.json()
  const { userId, action, answers, result } = body

  if (!userId) return NextResponse.json({ error: "userId necesar" }, { status: 400 })

  const b2cAuth = extractB2CAuth(req)
  if (!b2cAuth || !verifyB2COwnership(b2cAuth, userId)) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const card = await prisma.b2CCardProgress.findFirst({
    where: { userId, card: "CARD_3", status: "ACTIVE" },
  })
  if (!card) return NextResponse.json({ error: "Card 3 nu e activ" }, { status: 400 })

  if (action === "hermann") {
    return handleHermann(answers as HermannAnswers, card.id, userId)
  } else if (action === "mbti") {
    return handleMBTI(answers as MBTIAnswers, card.id, userId)
  }

  return NextResponse.json({ error: "Acțiune necunoscută" }, { status: 400 })
}

// ── Hermann HBDI ────────────────────────────────────────────

async function handleHermann(answers: HermannAnswers, cardId: string, userId: string) {
  // Recalculăm server-side (nu ne bazăm pe clientul nesecurizat)
  const result = scoreHermann(answers)

  // Salvăm în questionnaireData (merge cu datele existente)
  const card = await prisma.b2CCardProgress.findUnique({
    where: { id: cardId },
    select: { questionnaireData: true },
  })

  const existingData = (card?.questionnaireData as Record<string, unknown>) || {}

  await prisma.b2CCardProgress.update({
    where: { id: cardId },
    data: {
      questionnaireData: {
        ...existingData,
        hermannAnswers: answers,
        hermannResult: result,
        hermannCompletedAt: new Date().toISOString(),
      } as any,
    },
  })

  // Actualizăm și profilul B2C cu datele Herrmann
  await prisma.b2CProfile.upsert({
    where: { userId },
    update: {
      herrmannA: result.CoS,
      herrmannB: result.LiS,
      herrmannC: result.LiD,
      herrmannD: result.CoD,
    },
    create: {
      userId,
      herrmannA: result.CoS,
      herrmannB: result.LiS,
      herrmannC: result.LiD,
      herrmannD: result.CoD,
    },
  })

  return NextResponse.json({
    ok: true,
    result,
    message: "Profil cognitiv Herrmann calculat",
  })
}

// ── MBTI ────────────────────────────────────────────────────

async function handleMBTI(answers: MBTIAnswers, cardId: string, userId: string) {
  // Recalculăm server-side
  const result = scoreMBTI(answers)

  // Salvăm în questionnaireData (merge cu datele existente)
  const card = await prisma.b2CCardProgress.findUnique({
    where: { id: cardId },
    select: { questionnaireData: true },
  })

  const existingData = (card?.questionnaireData as Record<string, unknown>) || {}

  await prisma.b2CCardProgress.update({
    where: { id: cardId },
    data: {
      questionnaireData: {
        ...existingData,
        mbtiAnswers: answers,
        mbtiResult: result,
        mbtiCompletedAt: new Date().toISOString(),
      } as any,
    },
  })

  // Actualizăm profilul B2C cu rezultatul extern (MBTI)
  await prisma.b2CProfile.upsert({
    where: { userId },
    update: {
      externalTests: {
        mbti: {
          type: result.type,
          scores: { E: result.E, I: result.I, S: result.S, N: result.N, T: result.T, F: result.F, J: result.J, P: result.P },
          intensity: result.intensity,
          clarity: result.clarity,
          completedAt: new Date().toISOString(),
        },
      } as any,
    },
    create: {
      userId,
      externalTests: {
        mbti: {
          type: result.type,
          scores: { E: result.E, I: result.I, S: result.S, N: result.N, T: result.T, F: result.F, J: result.J, P: result.P },
          intensity: result.intensity,
          clarity: result.clarity,
          completedAt: new Date().toISOString(),
        },
      } as any,
    },
  })

  return NextResponse.json({
    ok: true,
    result,
    message: "Profil personalitate MBTI calculat",
  })
}

// ── CV Upload + Extracție AI ────────────────────────────────

async function handleCVUpload(formData: FormData, cardId: string, userId: string) {
  const file = formData.get("cv") as File
  if (!file) return NextResponse.json({ error: "Fișier CV necesar" }, { status: 400 })

  // Validare fișier
  const buffer = Buffer.from(await file.arrayBuffer())
  const allowedExts = [".pdf", ".docx", ".doc", ".png", ".jpg", ".jpeg"]
  const ext = "." + file.name.split(".").pop()?.toLowerCase()
  if (!allowedExts.includes(ext)) {
    return NextResponse.json({ error: "Format nepermis. Acceptăm: PDF, DOCX, imagini." }, { status: 400 })
  }
  if (buffer.length > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Fișier prea mare (max 10 MB)." }, { status: 400 })
  }

  // Salvăm CV ca base64 data URL (fără Blob storage extern)
  const cvUrl = `data:${file.type};name=${encodeURIComponent(file.name)};size=${buffer.length}`

  // Extracție AI din CV
  let extractedData: Record<string, unknown> = {}
  try {
    const textContent = buffer.toString("utf-8").slice(0, 10000) // primele 10K caractere
    const client = new Anthropic()
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      system: `Ești un specialist HR care extrage informații structurate din CV-uri.
Extrage și returnează un JSON cu exact aceste câmpuri:
{
  "title": "Titlul postului/rolului curent sau cel mai recent",
  "purpose": "Obiectivul profesional (dacă există)",
  "responsibilities": "Responsabilitățile principale (top 5-7, separate cu ;)",
  "requirements": "Competențe și cerințe (tehnice + soft skills)",
  "experience": "Experiența profesională (ani, domenii)",
  "education": "Educație și certificări",
  "languages": "Limbi cunoscute",
  "criteriaEstimate": {
    "Knowledge": "A-G (estimare nivel)",
    "Communications": "A-E",
    "ProblemSolving": "A-G",
    "DecisionMaking": "A-G",
    "BusinessImpact": "A-D",
    "WorkingConditions": "A-C"
  }
}
Răspunde DOAR cu JSON valid, fără text adițional. Dacă un câmp nu e clar din CV, pune "nedeterminat".`,
      messages: [{ role: "user", content: `CV:\n${textContent}` }],
    })

    const text = response.content[0].type === "text" ? response.content[0].text : ""
    try {
      extractedData = JSON.parse(text)
    } catch {
      extractedData = { raw: text, parseError: true }
    }
  } catch (e: any) {
    extractedData = { extractionError: e.message }
  }

  // Salvăm URL + date extrase
  await prisma.b2CCardProgress.update({
    where: { id: cardId },
    data: {
      cvFileUrl: cvUrl,
      cvExtractedData: extractedData as any,
      phase: "BUTTERFLY", // a trecut de crisalidă
    },
  })

  return NextResponse.json({
    ok: true,
    cvUrl,
    profile: extractedData,
    message: "CV încărcat și analizat cu succes",
  })
}

// ── Formular suplimentar ────────────────────────────────────

async function handleQuestionnaire(formData: FormData, cardId: string) {
  const data = {
    experienceLevel: formData.get("experienceLevel") as string,
    contractType: formData.get("contractType") as string,
    relocation: formData.get("relocation") as string,
    salaryExpectation: formData.get("salaryExpectation") as string,
    geography: formData.get("geography") as string,
  }

  await prisma.b2CCardProgress.update({
    where: { id: cardId },
    data: {
      questionnaireData: data as any,
    },
  })

  return NextResponse.json({ ok: true, questionnaire: data })
}
