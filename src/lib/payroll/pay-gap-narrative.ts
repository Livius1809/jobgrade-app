/**
 * pay-gap-narrative.ts — Template narativ pentru raportul Pay Gap
 *
 * Generează textul explicativ care însoțește datele din raport.
 * Clientul citește raportul și înțelege:
 * - Ce înseamnă fiecare secțiune
 * - Ce spune legea
 * - Ce arată datele din organizația sa
 * - Ce trebuie să facă
 *
 * Limbaj accesibil — pentru director HR, nu pentru statistician.
 */

import type { PayGapReport, WorkerCategory, SegregatedCategory, QuartileDistribution, JointAssessmentFlag } from "./pay-gap-report"

export interface NarrativeSection {
  titlu: string
  subtitlu?: string
  referintaLegala?: string
  explicatie: string
  interpretare: string
  masuri?: string
}

export interface PayGapNarrative {
  rezumatExecutiv: string
  metodologie: NarrativeSection
  categoriiComparabile: {
    explicatie: string
    categorii: Array<{
      categorie: WorkerCategory
      narativ: string
    }>
  }
  categoriiSegregate: {
    explicatie: string
    categorii: SegregatedCategory[]
  }
  cuartile: {
    explicatie: string
    interpretare: string
  }
  semnalizariArt10: {
    explicatie: string
    planActiune: string
  }
  recomandariFinale: string[]
  /** Secțiuni Company Profiler — coerență MVV ↔ structură salarială */
  profilerSections?: import("@/lib/company-profiler").ReportSection[]
}

export function generateNarrative(report: PayGapReport): PayGapNarrative {
  const { totalAngajati, totalFemei, totalBarbati } = report
  const procentF = totalAngajati > 0 ? Math.round(totalFemei / totalAngajati * 100) : 0

  // ═══ REZUMAT EXECUTIV ═══
  const rezumatExecutiv = [
    `Prezentul raport analizează decalajul salarial de gen din organizația dumneavoastră, conform cerințelor Art. 9 din Directiva EU 2023/970 privind transparența salarială.`,
    ``,
    `Au fost analizați ${totalAngajati} de angajați (${totalFemei} femei — ${procentF}%, ${totalBarbati} bărbați — ${100 - procentF}%), grupați în ${report.totalCategorii} categorii de lucrători.`,
    ``,
    `Din cele ${report.totalCategorii} categorii:`,
    `• ${report.categoriiComparabile} categorii permit comparația între genuri (ambele genuri prezente)`,
    `• ${report.categoriiSegregrate} categorii au un singur gen prezent (segregare ocupațională)`,
    ``,
    report.categoriiFlagArt10 > 0
      ? `⚠️ ${report.categoriiFlagArt10} ${report.categoriiFlagArt10 === 1 ? "categorie prezintă" : "categorii prezintă"} un decalaj salarial mai mare de 5%, ceea ce declanșează obligația de evaluare comună conform Art. 10 din Directivă.`
      : `✅ Nicio categorie comparabilă nu depășește pragul de 5%. Organizația se încadrează în limitele acceptabile.`,
  ].join("\n")

  // ═══ METODOLOGIE ═══
  const metodologie: NarrativeSection = {
    titlu: "Metodologie",
    referintaLegala: "Art. 9 alin. (1) lit. (a)-(g) Directiva EU 2023/970",
    explicatie: [
      `Analiza decalajului salarial se realizează per categorie de lucrători, conform principiului „mere cu mere": se compară remunerația femeilor și bărbaților care ocupă aceeași funcție, cu aceeași normă de lucru.`,
      ``,
      `Această abordare elimină distorsiunile cauzate de diferențele structurale (funcții diferite, norme diferite) și permite identificarea decalajelor reale, acolo unde ele există.`,
      ``,
      `Pentru fiecare categorie se calculează:`,
      `• Diferența medie de remunerare (Art. 9 alin. 1 lit. a, f)`,
      `• Diferența mediană de remunerare (Art. 9 alin. 1 lit. c)`,
      `• Diferența pe componente fixe — salariu de bază + sporuri fixe (Art. 9 alin. 1 lit. b)`,
      `• Diferența pe componente variabile — bonusuri + comisioane (Art. 9 alin. 1 lit. d)`,
    ].join("\n"),
    interpretare: [
      `Un decalaj pozitiv (ex: 10%) înseamnă că bărbații câștigă în medie cu 10% mai mult decât femeile în aceeași categorie.`,
      `Un decalaj negativ (ex: -5%) înseamnă că femeile câștigă mai mult.`,
      ``,
      `Conform Art. 10, dacă decalajul depășește 5% într-o categorie și nu poate fi justificat prin criterii obiective, se impune evaluarea comună cu reprezentanții lucrătorilor.`,
      ``,
      `Notă privind protecția datelor: pentru categoriile cu mai puțin de 5 persoane de un gen, datele sunt semnalate ca nesemnificative statistic (k-anonymity), dar sunt totuși raportate pentru transparență.`,
    ].join("\n"),
    masuri: "",
  }

  // ═══ CATEGORII COMPARABILE ═══
  const categoriiNarativ = report.categoriiLucratori.map(cat => {
    const lines: string[] = []

    lines.push(`Funcția „${cat.functie}" cu norma ${cat.norma}: ${cat.numarFemei} femei și ${cat.numarBarbati} bărbați.`)
    lines.push(``)

    if (!cat.kAnonymity) {
      lines.push(`⚠ Unul sau ambele grupuri au mai puțin de 5 persoane. Rezultatele sunt orientative, nu semnificative statistic.`)
      lines.push(``)
    }

    // Interpretare gap
    const absGap = Math.abs(cat.gapMedieProcent)
    if (absGap === 0) {
      lines.push(`Nu există decalaj salarial în această categorie. Remunerația medie este egală între genuri.`)
    } else if (absGap <= 5) {
      lines.push(`Decalajul de ${cat.gapMedieProcent}% se încadrează sub pragul de 5% stabilit de Directivă. Nu necesită măsuri corective obligatorii.`)
    } else {
      const favorizat = cat.gapMedieProcent > 0 ? "bărbați" : "femei"
      lines.push(`Decalajul mediu de ${cat.gapMedieProcent}% (în favoarea ${favorizat === "bărbați" ? "bărbaților" : "femeilor"}) depășește pragul de 5%.`)
      lines.push(``)
      lines.push(`Conform Art. 10 din Directiva EU 2023/970, acest decalaj declanșează obligația de evaluare comună cu reprezentanții lucrătorilor, în termen de 6 luni de la publicarea prezentului raport.`)
      lines.push(``)
      lines.push(`Ce trebuie investigat:`)
      lines.push(`• Există diferențe de experiență sau vechime care justifică decalajul?`)
      lines.push(`• Există diferențe de performanță documentate?`)
      lines.push(`• Pozițiile sunt cu adevărat echivalente (aceleași responsabilități)?`)
      lines.push(`• Dacă nu se găsesc justificări obiective, se impune un plan de remediere.`)
    }

    // Gap mediană vs medie
    if (cat.gapMedieProcent !== cat.gapMedianaProcent) {
      lines.push(``)
      if (Math.abs(cat.gapMedianaProcent) < Math.abs(cat.gapMedieProcent)) {
        lines.push(`Observație: decalajul median (${cat.gapMedianaProcent}%) este mai mic decât cel mediu (${cat.gapMedieProcent}%). Aceasta sugerează că decalajul este influențat de câteva valori extreme, nu de o diferență sistematică.`)
      } else {
        lines.push(`Observație: decalajul median (${cat.gapMedianaProcent}%) este mai mare decât cel mediu, ceea ce sugerează o diferență sistematică în remunerare, nu doar câteva excepții.`)
      }
    }

    return {
      categorie: cat,
      narativ: lines.join("\n"),
    }
  })

  // ═══ CATEGORII SEGREGATE ═══
  const segregateExplicatie = [
    `Următoarele categorii de lucrători au un singur gen prezent. Decalajul salarial nu poate fi calculat deoarece nu există punct de comparație.`,
    ``,
    `Segregarea ocupațională nu este în sine o încălcare a Directivei, dar poate indica tipare structurale care merită atenție: de ce anumite funcții sunt ocupate exclusiv de un gen?`,
    ``,
    report.categoriiSegregate.length > 5
      ? `Organizația prezintă un grad ridicat de segregare ocupațională (${report.categoriiSegregrate} din ${report.totalCategorii} categorii). Aceasta este o observație, nu o obligație legală, dar poate influența percepția generală de echitate.`
      : `Organizația are ${report.categoriiSegregrate} categorii segregate — un nivel moderat.`,
  ].join("\n")

  // ═══ CUARTILE ═══
  const q1 = report.distributieQuartile.find(q => q.cuartila === 1)
  const q4 = report.distributieQuartile.find(q => q.cuartila === 4)

  const cuartileExplicatie = [
    `Distribuția pe cuartile arată cum sunt repartizați angajații de fiecare gen pe cele 4 intervale salariale (de la cel mai mic la cel mai mare salariu).`,
    ``,
    `Într-o organizație perfect echitabilă, proporția de femei și bărbați ar fi aproximativ egală în fiecare cuartilă. Diferențele mari sugerează concentrarea unui gen pe anumite niveluri salariale.`,
  ].join("\n")

  const cuartileInterpretare = [
    q1 && q1.procentFemei > 70
      ? `⚠ Cuartila inferioară (salariile cele mai mici) conține ${q1.procentFemei}% femei — o concentrare disproporționată.`
      : q1
        ? `Cuartila inferioară: ${q1.procentFemei}% femei, ${q1.procentBarbati}% bărbați.`
        : "",
    q4 && q4.procentBarbati > 70
      ? `⚠ Cuartila superioară (salariile cele mai mari) conține ${q4.procentBarbati}% bărbați — concentrare disproporționată.`
      : q4
        ? `Cuartila superioară: ${q4.procentFemei}% femei, ${q4.procentBarbati}% bărbați.`
        : "",
  ].filter(Boolean).join("\n")

  // ═══ ART. 10 ═══
  const art10Explicatie = report.categoriiFlagArt10 > 0
    ? [
        `Conform Art. 10 din Directiva EU 2023/970, atunci când raportul de transparență salarială relevă o diferență de remunerare de cel puțin 5% într-o categorie de lucrători, iar angajatorul nu poate justifica această diferență prin criterii obiective, angajatorul trebuie să efectueze o evaluare comună cu reprezentanții lucrătorilor.`,
        ``,
        `Termen: 6 luni de la publicarea prezentului raport.`,
        ``,
        `Evaluarea comună trebuie să includă: analiza proporției de gen per categorie, detaliile diferențelor, cauzele identificate, măsurile de remediere propuse și monitorizarea eficacității.`,
      ].join("\n")
    : `Nicio categorie comparabilă nu depășește pragul de 5%. Nu se impune evaluarea comună conform Art. 10.`

  const art10Plan = report.categoriiFlagArt10 > 0
    ? [
        `Plan de acțiune recomandat:`,
        ``,
        `1. Constituiți echipa de evaluare comună (management + reprezentanți lucrători)`,
        `2. Analizați cauzele decalajului per categorie flagată`,
        `3. Documentați justificările obiective (dacă există)`,
        `4. Elaborați planul de remediere pentru diferențele nejustificate`,
        `5. Implementați ajustările salariale conform planului`,
        `6. Monitorizați efectul — rulați din nou analiza după implementare`,
        ``,
        `JobGrade vă poate asista în fiecare etapă a acestui proces.`,
      ].join("\n")
    : `Monitorizați periodic prin rulări ulterioare ale analizei.`

  // ═══ RECOMANDĂRI FINALE ═══
  const recomandariFinale = [...report.recomandari]

  if (report.categoriiLucratori.some(c => !c.kAnonymity)) {
    recomandariFinale.push(
      `Unele categorii au grupuri sub 5 persoane. Rezultatele sunt orientative. Pe măsură ce organizația crește, acuratețea analizei va crește.`
    )
  }

  recomandariFinale.push(
    `Recomandăm rularea periodică a acestei analize (minim anual, conform directivei) pentru a monitoriza evoluția și eficacitatea măsurilor implementate.`
  )

  return {
    rezumatExecutiv,
    metodologie,
    categoriiComparabile: {
      explicatie: `Următoarele categorii permit comparația directă între femei și bărbați care ocupă aceeași funcție, cu aceeași normă de lucru. Aceasta este analiza fundamentală cerută de Directivă.`,
      categorii: categoriiNarativ,
    },
    categoriiSegregate: {
      explicatie: segregateExplicatie,
      categorii: report.categoriiSegregate,
    },
    cuartile: {
      explicatie: cuartileExplicatie,
      interpretare: cuartileInterpretare,
    },
    semnalizariArt10: {
      explicatie: art10Explicatie,
      planActiune: art10Plan,
    },
    recomandariFinale,
  }
}
