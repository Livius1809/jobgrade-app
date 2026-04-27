/**
 * /api/v1/sociogram
 *
 * Sociograma Balint — masurare afinitate intre membri echipa.
 *
 * Procesul:
 * 1. Citeste scenariul
 * 2. Marcheaza ✓ (prefer) sau ✗ (nu prefer) per coleg
 * 3. Scoreaza TOTI colegii de la N la 1 (N=cel mai preferat, 1=cel mai putin)
 *    Scorurile sunt TOATE pozitive. Respingerea e marcata doar cu asterisc (*).
 * 4. Totalul = suma scorurilor primite. Clasament descrescator.
 * 5. Diagrama: 3 tipuri relatii (reciproca atractie, reciproca respingere, mixta)
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
  // Per coleg: scorul (1-N, pozitiv) + flag daca e respingere (asterisc)
  ratings: Record<string, { score: number; isRejection: boolean }>
  completedAt: string | null
}

interface RelationshipType {
  from: string
  to: string
  type: "ATTRACTION" | "REJECTION" | "MIXED"
}

interface SociogramResult {
  memberCode: string
  memberName: string
  totalScore: number             // suma scorurilor primite (toate pozitive)
  preferenceCount: number        // cati l-au ales FARA asterisc
  rejectionCount: number         // cati l-au ales CU asterisc
  rank: number                   // pozitia in clasament
  isIsolated: boolean            // zero preferinte (toti cu asterisc)
  isControversial: boolean       // multe preferinte SI multe respingeri
}

interface SociogramGroup {
  id: string
  name: string
  type: "DEPARTMENT" | "PROJECT_TEAM"
  members: GroupMember[]
  responses: MemberResponse[]
  status: "COLLECTING" | "COMPLETED"
  results: SociogramResult[] | null
  relationships: RelationshipType[] | null
  createdAt: string
  completedAt: string | null
}

interface SociogramState {
  groups: SociogramGroup[]
}

const SCENARIO_TEXT = `Stii sigur ca va urma un proiect pe care e clar ca nu il vei putea duce de unul singur la bun sfarsit, dar nu stii de cati oameni vei avea nevoie in echipa de proiect.

Persoanele disponibile sunt colegii tai actuali. Nimic nu va diferentiaza din punct de vedere profesional — stiti cu totii sa faceti orice este nevoie, in cel mai scurt timp si cu maximum de profesionalism.

Nu conteaza competentele tehnice, pozitia ierarhica sau departamentul. Singura intrebare este: CU CINE te simti cel mai bine sa lucrezi?

Nu exista raspunsuri gresite. Nu e vorba de competenta sau profesionalism — e vorba de chimia naturala dintre oameni.`

const INSTRUCTIONS_TEXT = `Cum completezi:

PAS 1: Priveste lista colegilor tai. Marcheaza cu ✓ pe cei cu care DORESTI sa colaborezi si cu ✗ pe cei cu care NU doresti.

PAS 2: Acorda fiecarui coleg un scor unic, de la cel mai mare (cel mai preferat) la 1 (cel mai putin preferat). Toti primesc scor — inclusiv cei marcati cu ✗. Scorurile sunt in ordine descrescatoare.

Cei marcati cu ✗ vor aparea in raport cu un asterisc (*) care semnaleaza respingerea. Scorul lor ramane pozitiv — doar marcajul conteaza.`

function generateId(): string {
  return "sg_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

async function getState(tenantId: string): Promise<SociogramState> {
  return await getTenantData<SociogramState>(tenantId, "SOCIOGRAM") || { groups: [] }
}

async function saveState(tenantId: string, state: SociogramState): Promise<void> {
  await setTenantData(tenantId, "SOCIOGRAM", state)
}

// Calcul rezultate + relatii
function computeResults(group: SociogramGroup): { results: SociogramResult[]; relationships: RelationshipType[] } {
  const members = group.members
  const responses = group.responses

  // Calcul scoruri totale per membru
  const results = members.map(member => {
    let totalScore = 0
    let prefCount = 0
    let rejCount = 0

    for (const resp of responses) {
      if (resp.fromCode === member.code) continue
      const rating = resp.ratings[member.code]
      if (!rating) continue

      totalScore += rating.score
      if (rating.isRejection) rejCount++
      else prefCount++
    }

    return {
      memberCode: member.code,
      memberName: member.name,
      totalScore,
      preferenceCount: prefCount,
      rejectionCount: rejCount,
      rank: 0,
      isIsolated: prefCount === 0,
      isControversial: prefCount >= 2 && rejCount >= 2,
    }
  }).sort((a, b) => b.totalScore - a.totalScore)

  results.forEach((r, idx) => { r.rank = idx + 1 })

  // Calcul relatii reciproce (3 tipuri)
  const relationships: RelationshipType[] = []
  const seen = new Set<string>()

  for (const respA of responses) {
    for (const respB of responses) {
      if (respA.fromCode === respB.fromCode) continue
      const pairKey = [respA.fromCode, respB.fromCode].sort().join("-")
      if (seen.has(pairKey)) continue
      seen.add(pairKey)

      const aToB = respA.ratings[respB.fromCode]
      const bToA = respB.ratings[respA.fromCode]
      if (!aToB || !bToA) continue

      let type: RelationshipType["type"]
      if (!aToB.isRejection && !bToA.isRejection) {
        type = "ATTRACTION" // ambii fara asterisc
      } else if (aToB.isRejection && bToA.isRejection) {
        type = "REJECTION" // ambii cu asterisc
      } else {
        type = "MIXED" // unul cu, altul fara
      }

      relationships.push({ from: respA.fromCode, to: respB.fromCode, type })
    }
  }

  return { results, relationships }
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

// POST
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
      relationships: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    }

    state.groups.push(group)
    await saveState(session.user.tenantId, state)
    return NextResponse.json({ ok: true, groupId: group.id })
  }

  if (action === "submit-response") {
    const { groupId, fromCode, ratings } = body
    // ratings: { "colegCode": { score: 7, isRejection: false }, ... }
    if (!groupId || !fromCode || !ratings) {
      return NextResponse.json({ error: "groupId, fromCode si ratings obligatorii" }, { status: 400 })
    }

    const group = state.groups.find(g => g.id === groupId)
    if (!group) return NextResponse.json({ error: "Grup negasit" }, { status: 404 })
    if (group.status === "COMPLETED") return NextResponse.json({ error: "Grupul e deja finalizat" }, { status: 400 })

    const idx = group.responses.findIndex(r => r.fromCode === fromCode)
    const response: MemberResponse = {
      fromCode,
      ratings,
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

// PATCH — Finalizeaza
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
    return NextResponse.json({ error: "Minim 3 raspunsuri necesare" }, { status: 400 })
  }

  const { results, relationships } = computeResults(group)
  group.results = results
  group.relationships = relationships
  group.status = "COMPLETED"
  group.completedAt = new Date().toISOString()

  await saveState(session.user.tenantId, state)

  const attractionPairs = relationships.filter(r => r.type === "ATTRACTION").length
  const rejectionPairs = relationships.filter(r => r.type === "REJECTION").length
  const mixedPairs = relationships.filter(r => r.type === "MIXED").length

  return NextResponse.json({
    ok: true,
    results,
    relationships,
    summary: {
      mostPreferred: results[0]?.memberName,
      mostPreferredScore: results[0]?.totalScore,
      leastPreferred: results[results.length - 1]?.memberName,
      leastPreferredScore: results[results.length - 1]?.totalScore,
      isolated: results.filter(r => r.isIsolated).map(r => r.memberName),
      controversial: results.filter(r => r.isControversial).map(r => r.memberName),
      attractionPairs,
      rejectionPairs,
      mixedPairs,
    },
  })
}
