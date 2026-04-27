/**
 * /api/v1/sociogram
 *
 * Sociograma Balint — masurare afinitate intre membri echipa.
 *
 * Procesul de completare (2 pasi):
 * Pas 1: Citeste scenariul. Marcheaza cu ✓ colegii cu care doreste sa colaboreze
 *        si cu ✗ pe cei cu care nu doreste.
 * Pas 2: Scoreaza de la 1 la T pe cei cu ✓ (1 = preferinta cea mai mica, T = cea mai mare)
 *        si de la 1 la P pe cei cu ✗ (1 = lipsa preferintei cea mai mica, P = cea mai mare)
 *        unde T + P = numarul total de membri din echipa (exclusiv cel care completeaza).
 *
 * Scorare: preferintele primesc valori pozitive (ranking-ul), lipsa preferintei primesc
 * valori negative (-ranking). Se totalizeaza per persoana si se face clasament descrescator.
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
  // Pas 1: marcaj preferinta (true) sau lipsa preferinta (false) per coleg
  choices: Record<string, boolean>  // colegCode -> true (✓ prefer) | false (✗ nu prefer)
  // Pas 2: ranking numeric — preferintele primesc scor pozitiv, lipsa preferintei scor negativ
  scores: Record<string, number>    // colegCode -> scor (pozitiv = preferinta, negativ = lipsa pref)
  completedAt: string | null
}

interface SociogramResult {
  memberCode: string
  memberName: string
  totalScore: number             // suma tuturor scorurilor primite (pozitive + negative)
  totalPreferences: number       // cate ✓ a primit
  totalRejections: number        // cate ✗ a primit
  avgPreferenceRank: number      // media ranking-urilor pozitive primite
  avgRejectionRank: number       // media ranking-urilor negative primite
  reciprocalPrefs: string[]      // cu cine are preferinta reciproca (ambii ✓)
  reciprocalRejs: string[]       // cu cine are respingere reciproca (ambii ✗)
  isIsolated: boolean            // zero preferinte primite
  isControversial: boolean       // multe preferinte SI multe respingeri
  rank: number                   // pozitia in clasament (1 = cel mai preferat)
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

// Scenariul care indeparteaza criteriile rationale
const SCENARIO_TEXT = `Stii sigur ca va urma un proiect pe care e clar ca nu il vei putea duce de unul singur la bun sfarsit, dar nu stii de cati oameni vei avea nevoie in echipa de proiect.

Persoanele disponibile sunt colegii tai actuali. Nimic nu va diferentiaza din punct de vedere profesional — stiti cu totii sa faceti orice este nevoie, in cel mai scurt timp si cu maximum de profesionalism.

Nu conteaza competentele tehnice, pozitia ierarhica sau departamentul. Singura intrebare este: CU CINE te simti cel mai bine sa lucrezi?

Nu exista raspunsuri gresite. Nu e vorba de competenta sau profesionalism — e vorba de chimia naturala dintre oameni.`

const INSTRUCTIONS_TEXT = `Cum completezi:

PAS 1: Priveste lista colegilor tai. Marcheaza cu ✓ pe cei cu care DORESTI sa colaborezi si cu ✗ pe cei cu care NU doresti.

PAS 2: Dintre cei marcati cu ✓, acorda un scor de la 1 la T (unde T este numarul total al celor cu ✓). Scorul 1 inseamna preferinta cea mai mica, iar T inseamna preferinta cea mai mare.

La fel, dintre cei marcati cu ✗, acorda un scor de la 1 la P (unde P este numarul total al celor cu ✗). Scorul 1 inseamna lipsa de preferinta cea mai mica, iar P inseamna lipsa de preferinta cea mai mare.

T + P = numarul total de colegi (fara tine).`

function generateId(): string {
  return "sg_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

async function getState(tenantId: string): Promise<SociogramState> {
  return await getTenantData<SociogramState>(tenantId, "SOCIOGRAM") || { groups: [] }
}

async function saveState(tenantId: string, state: SociogramState): Promise<void> {
  await setTenantData(tenantId, "SOCIOGRAM", state)
}

// Calcul rezultate sociograma conform scorare Balint
function computeResults(group: SociogramGroup): SociogramResult[] {
  const members = group.members
  const responses = group.responses

  const results = members.map(member => {
    let totalScore = 0
    let totalPrefs = 0
    let totalRejs = 0
    let sumPrefRanks = 0
    let sumRejRanks = 0
    const reciprocalPrefs: string[] = []
    const reciprocalRejs: string[] = []

    // Ce au raspuns ALTII despre acest membru
    for (const resp of responses) {
      if (resp.fromCode === member.code) continue
      const score = resp.scores[member.code]
      if (score === undefined) continue

      totalScore += score
      if (score > 0) {
        totalPrefs++
        sumPrefRanks += score
      }
      if (score < 0) {
        totalRejs++
        sumRejRanks += Math.abs(score)
      }
    }

    // Reciprocitate — bazata pe choices (✓/✗), nu pe scoruri
    const myResponse = responses.find(r => r.fromCode === member.code)
    if (myResponse) {
      for (const otherMember of members) {
        if (otherMember.code === member.code) continue
        const iChoseOther = myResponse.choices[otherMember.code]
        const otherResponse = responses.find(r => r.fromCode === otherMember.code)
        const otherChoseMe = otherResponse?.choices[member.code]

        if (iChoseOther === true && otherChoseMe === true) reciprocalPrefs.push(otherMember.code)
        if (iChoseOther === false && otherChoseMe === false) reciprocalRejs.push(otherMember.code)
      }
    }

    return {
      memberCode: member.code,
      memberName: member.name,
      totalScore,
      totalPreferences: totalPrefs,
      totalRejections: totalRejs,
      avgPreferenceRank: totalPrefs > 0 ? Math.round((sumPrefRanks / totalPrefs) * 10) / 10 : 0,
      avgRejectionRank: totalRejs > 0 ? Math.round((sumRejRanks / totalRejs) * 10) / 10 : 0,
      reciprocalPrefs,
      reciprocalRejs,
      isIsolated: totalPrefs === 0,
      isControversial: totalPrefs >= 3 && totalRejs >= 3,
      rank: 0, // se calculeaza dupa sortare
    }
  }).sort((a, b) => b.totalScore - a.totalScore)

  // Atribuie rank-uri (clasament descrescator dupa totalScore)
  results.forEach((r, idx) => { r.rank = idx + 1 })

  return results
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
    instructions: INSTRUCTIONS_TEXT,
    groups: state.groups.map(g => ({
      ...g,
      responses: undefined,
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
    return NextResponse.json({ ok: true, groupId: group.id, scenario: SCENARIO_TEXT, instructions: INSTRUCTIONS_TEXT })
  }

  if (action === "submit-response") {
    const { groupId, fromCode, choices, scores } = body
    if (!groupId || !fromCode || !choices || !scores) {
      return NextResponse.json({ error: "groupId, fromCode, choices si scores obligatorii" }, { status: 400 })
    }

    const group = state.groups.find(g => g.id === groupId)
    if (!group) return NextResponse.json({ error: "Grup negasit" }, { status: 404 })
    if (group.status === "COMPLETED") return NextResponse.json({ error: "Grupul e deja finalizat" }, { status: 400 })

    // Validare: T + P trebuie sa fie = nr colegi (exclusiv cel care completeaza)
    const totalColegi = group.members.length - 1
    const preferred = Object.entries(choices).filter(([_, v]) => v === true).length
    const rejected = Object.entries(choices).filter(([_, v]) => v === false).length

    if (preferred + rejected !== totalColegi) {
      return NextResponse.json({
        error: `Trebuie sa marchezi toti colegii (${totalColegi}). Ai marcat ${preferred + rejected}.`,
      }, { status: 400 })
    }

    // Transformam scorurile: preferintele raman pozitive, lipsa preferintei devine negativa
    const finalScores: Record<string, number> = {}
    for (const [code, isPreferred] of Object.entries(choices)) {
      const rawScore = scores[code]
      if (rawScore === undefined) continue
      finalScores[code] = isPreferred ? rawScore : -rawScore
    }

    const idx = group.responses.findIndex(r => r.fromCode === fromCode)
    const response: MemberResponse = {
      fromCode,
      choices: choices as Record<string, boolean>,
      scores: finalScores,
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
      mostPreferredScore: group.results[0]?.totalScore,
      leastPreferred: group.results[group.results.length - 1]?.memberName,
      leastPreferredScore: group.results[group.results.length - 1]?.totalScore,
      isolated: group.results.filter(r => r.isIsolated).map(r => r.memberName),
      controversial: group.results.filter(r => r.isControversial).map(r => r.memberName),
      reciprocalPrefPairs: group.results.reduce((sum, r) => sum + r.reciprocalPrefs.length, 0) / 2,
      reciprocalRejPairs: group.results.reduce((sum, r) => sum + r.reciprocalRejs.length, 0) / 2,
    },
  })
}
