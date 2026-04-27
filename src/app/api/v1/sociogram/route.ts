/**
 * /api/v1/sociogram
 *
 * Sociograma Balint — masurare afinitate intre membri echipa.
 * Scenariu (poveste) → tabel preferinte → scorare → diagrama.
 *
 * GET  — Lista grupuri + status completare + rezultate
 * POST — Creaza grup SAU inregistreaza raspuns membru
 * PATCH — Finalizeaza grup (calculeaza scoruri)
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTenantData, setTenantData } from "@/lib/tenant-storage"

export const dynamic = "force-dynamic"

interface GroupMember {
  code: string
  name: string
}

interface MemberResponse {
  fromCode: string
  preferences: Record<string, number> // colegCode → -2 (respingere puternica) | -1 (respingere) | 0 (neutru) | 1 (preferinta) | 2 (preferinta puternica)
  completedAt: string | null
}

interface SociogramResult {
  memberCode: string
  memberName: string
  totalPreferences: number   // cate preferinte a primit
  totalRejections: number    // cate respingeri a primit
  intensityScore: number     // scor intensitate generala (preferinte - respingeri normalizat)
  reciprocalPrefs: string[]  // cu cine are preferinta reciproca
  reciprocalRejs: string[]   // cu cine are respingere reciproca
  isIsolated: boolean        // nu a primit nicio preferinta
  isControversial: boolean   // multe preferinte SI multe respingeri
}

interface SociogramGroup {
  id: string
  name: string
  type: "DEPARTMENT" | "PROJECT_TEAM"
  members: GroupMember[]
  responses: MemberResponse[]
  status: "COLLECTING" | "COMPLETED"
  results: SociogramResult[] | null
  createdAt: string
  completedAt: string | null
}

interface SociogramState {
  groups: SociogramGroup[]
}

// Scenariul (povestea) care indeparteaza criteriile rationale
const SCENARIO_TEXT = `Imaginati-va urmatoarea situatie:

Compania organizeaza un proiect special care dureaza 3 luni. Pentru acest proiect, aveti posibilitatea sa va alegeti echipa cu care lucrati, din colegii vostri actuali.

Nu conteaza competentele tehnice (presupunem ca toti colegii au competentele necesare). Nu conteaza nici pozitia ierarhica sau departamentul.

Singura intrebare este: CU CINE va simtiti cel mai bine sa lucrati? Cu cine comunicati natural, va intelegeti fara efort, simtiti ca va completati?

Si reversul: exista colegi cu care interactiunea e mai dificila, comunicarea necesita mai mult efort, sau simtiti o tensiune neexprimata?

Nu exista raspunsuri gresite. Nu e vorba de competenta sau profesionalism — e vorba de chimia naturala dintre oameni.

Pentru fiecare coleg, alegeti:
  ++ Preferinta puternica (as alege cu siguranta)
  +  Preferinta (as alege)
  0  Neutru (nici pro, nici contra)
  -  Evitare (as prefera sa nu)
  -- Evitare puternica (as evita cu siguranta)`

function generateId(): string {
  return "sg_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

async function getState(tenantId: string): Promise<SociogramState> {
  return await getTenantData<SociogramState>(tenantId, "SOCIOGRAM") || { groups: [] }
}

async function saveState(tenantId: string, state: SociogramState): Promise<void> {
  await setTenantData(tenantId, "SOCIOGRAM", state)
}

// Calcul rezultate sociograma
function computeResults(group: SociogramGroup): SociogramResult[] {
  const members = group.members
  const responses = group.responses

  return members.map(member => {
    let totalPrefs = 0
    let totalRejs = 0
    let sumIntensity = 0
    const reciprocalPrefs: string[] = []
    const reciprocalRejs: string[] = []

    // Ce au raspuns ALTII despre acest membru
    for (const resp of responses) {
      if (resp.fromCode === member.code) continue
      const score = resp.preferences[member.code] || 0
      if (score > 0) { totalPrefs++; sumIntensity += score }
      if (score < 0) { totalRejs++; sumIntensity += score }
    }

    // Reciprocitate
    const myResponse = responses.find(r => r.fromCode === member.code)
    if (myResponse) {
      for (const otherMember of members) {
        if (otherMember.code === member.code) continue
        const myScoreForOther = myResponse.preferences[otherMember.code] || 0
        const otherResponse = responses.find(r => r.fromCode === otherMember.code)
        const otherScoreForMe = otherResponse?.preferences[member.code] || 0

        if (myScoreForOther > 0 && otherScoreForMe > 0) reciprocalPrefs.push(otherMember.code)
        if (myScoreForOther < 0 && otherScoreForMe < 0) reciprocalRejs.push(otherMember.code)
      }
    }

    const maxPossible = members.length - 1
    const intensityScore = maxPossible > 0
      ? Math.round((sumIntensity / (maxPossible * 2)) * 100) / 100 // normalizat -1 la 1
      : 0

    return {
      memberCode: member.code,
      memberName: member.name,
      totalPreferences: totalPrefs,
      totalRejections: totalRejs,
      intensityScore,
      reciprocalPrefs,
      reciprocalRejs,
      isIsolated: totalPrefs === 0,
      isControversial: totalPrefs >= 3 && totalRejs >= 3,
    }
  }).sort((a, b) => b.intensityScore - a.intensityScore)
}

// GET
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const state = await getState(session.user.tenantId)

  return NextResponse.json({
    scenario: SCENARIO_TEXT,
    groups: state.groups.map(g => ({
      ...g,
      responses: undefined, // nu expunem raspunsurile individuale
      responseCount: g.responses.length,
      memberCount: g.members.length,
      completionPct: g.members.length > 0
        ? Math.round((g.responses.length / g.members.length) * 100) : 0,
    })),
    stats: {
      totalGroups: state.groups.length,
      collecting: state.groups.filter(g => g.status === "COLLECTING").length,
      completed: state.groups.filter(g => g.status === "COMPLETED").length,
    },
  })
}

// POST — Creaza grup SAU inregistreaza raspuns
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const body = await req.json()
  const { action } = body
  const state = await getState(session.user.tenantId)

  if (action === "create-group") {
    const { name, type, members } = body
    if (!name || !members?.length || members.length < 3) {
      return NextResponse.json({ error: "Nume, tip si minim 3 membri obligatorii" }, { status: 400 })
    }

    const group: SociogramGroup = {
      id: generateId(),
      name,
      type: type || "DEPARTMENT",
      members: members.map((m: any) => ({ code: m.code, name: m.name })),
      responses: [],
      status: "COLLECTING",
      results: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    }

    state.groups.push(group)
    await saveState(session.user.tenantId, state)
    return NextResponse.json({ ok: true, groupId: group.id, scenario: SCENARIO_TEXT })
  }

  if (action === "submit-response") {
    const { groupId, fromCode, preferences } = body
    if (!groupId || !fromCode || !preferences) {
      return NextResponse.json({ error: "groupId, fromCode si preferences obligatorii" }, { status: 400 })
    }

    const group = state.groups.find(g => g.id === groupId)
    if (!group) return NextResponse.json({ error: "Grup negasit" }, { status: 404 })
    if (group.status === "COMPLETED") return NextResponse.json({ error: "Grupul e deja finalizat" }, { status: 400 })

    // Inlocuieste daca exista deja raspuns de la acest membru
    const idx = group.responses.findIndex(r => r.fromCode === fromCode)
    const response: MemberResponse = {
      fromCode,
      preferences,
      completedAt: new Date().toISOString(),
    }

    if (idx >= 0) group.responses[idx] = response
    else group.responses.push(response)

    await saveState(session.user.tenantId, state)

    return NextResponse.json({
      ok: true,
      responseCount: group.responses.length,
      memberCount: group.members.length,
      allCompleted: group.responses.length >= group.members.length,
    })
  }

  return NextResponse.json({ error: "action necunoscuta" }, { status: 400 })
}

// PATCH — Finalizeaza grup (calculeaza scoruri)
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const body = await req.json()
  const { groupId } = body

  if (!groupId) return NextResponse.json({ error: "groupId obligatoriu" }, { status: 400 })

  const state = await getState(session.user.tenantId)
  const group = state.groups.find(g => g.id === groupId)
  if (!group) return NextResponse.json({ error: "Grup negasit" }, { status: 404 })

  if (group.responses.length < 3) {
    return NextResponse.json({ error: "Minim 3 raspunsuri necesare pentru finalizare" }, { status: 400 })
  }

  group.results = computeResults(group)
  group.status = "COMPLETED"
  group.completedAt = new Date().toISOString()

  await saveState(session.user.tenantId, state)

  return NextResponse.json({
    ok: true,
    results: group.results,
    summary: {
      mostPreferred: group.results[0]?.memberName,
      mostRejected: [...group.results].sort((a, b) => b.totalRejections - a.totalRejections)[0]?.memberName,
      isolated: group.results.filter(r => r.isIsolated).map(r => r.memberName),
      controversial: group.results.filter(r => r.isControversial).map(r => r.memberName),
      reciprocalPairs: group.results.flatMap(r => r.reciprocalPrefs.map(p => `${r.memberCode}-${p}`)).length / 2,
    },
  })
}
