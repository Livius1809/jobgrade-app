"use client"

import { useState } from "react"

interface GuideQuestion {
  criterionName: string
  criterionShort: string
  color: string
  questions: string[]
  placeholder: string
  fieldTarget: "description" | "responsibilities" | "requirements"
}

const GUIDE_QUESTIONS: GuideQuestion[] = [
  {
    criterionName: "Educație / Experiență",
    criterionShort: "Educ.",
    color: "indigo",
    questions: [
      "Ce nivel de studii este necesar? (medii, superioare, postuniversitare)",
      "Câți ani de experiență similară sunt necesari?",
      "Sunt necesare cursuri sau certificări specifice?",
    ],
    placeholder: "Ex: Studii superioare în domeniul optic, minim 3 ani experiență în retail, curs acreditat optometrie",
    fieldTarget: "requirements",
  },
  {
    criterionName: "Comunicare",
    criterionShort: "Com.",
    color: "violet",
    questions: [
      "Cu cine comunică titularul? (echipă, clienți, management, furnizori)",
      "Ce tip de comunicare predomină? (bază, persuasiune, negociere, strategică)",
      "Trebuie să prezinte rapoarte sau să susțină prezentări?",
    ],
    placeholder: "Ex: Comunicare zilnică cu echipa de 5-7 persoane, consiliere clienți, raportare lunară către management zonal",
    fieldTarget: "responsibilities",
  },
  {
    criterionName: "Rezolvarea problemelor",
    criterionShort: "Rez.pb.",
    color: "fuchsia",
    questions: [
      "Ce tip de probleme rezolvă titularul? (de rutină, variate, complexe, strategice)",
      "Cât de des apar situații neprevăzute?",
      "Are nevoie de analiză sau creativitate pentru rezolvare?",
    ],
    placeholder: "Ex: Rezolvă reclamații clienți, gestionează situații de stoc insuficient, adaptează programul echipei la fluctuații de activitate",
    fieldTarget: "responsibilities",
  },
  {
    criterionName: "Luarea deciziilor",
    criterionShort: "Decizii",
    color: "amber",
    questions: [
      "Ce decizii ia titularul? (de rutină, operaționale, independente, strategice)",
      "Cât de autonom este în luarea deciziilor?",
      "Ce impact au deciziile sale? (asupra echipei, departamentului, organizației)",
    ],
    placeholder: "Ex: Decide programul de lucru al echipei, aprobă retururi până la 500 RON, escaladează situații complexe către management",
    fieldTarget: "responsibilities",
  },
  {
    criterionName: "Impact asupra afacerii",
    criterionShort: "Impact",
    color: "coral",
    questions: [
      "Care e contribuția directă a postului la rezultatele organizației?",
      "Postul influențează venituri, costuri, sau doar susține operațiunile?",
      "Răspunde de un buget? De obiective financiare?",
    ],
    placeholder: "Ex: Răspunde de obiectivul de vânzări al punctului de lucru (impact direct pe venituri), gestionează stocuri în valoare de X RON",
    fieldTarget: "description",
  },
  {
    criterionName: "Condiții de lucru",
    criterionShort: "Condiții",
    color: "slate",
    questions: [
      "Unde lucrează? (birou, teren, magazin, laborator)",
      "Există condiții speciale? (program prelungit, deplasări, expunere la factori de risc)",
      "Este necesar echipament special sau dispozitive medicale?",
    ],
    placeholder: "Ex: Lucru în magazin, program în schimburi inclusiv weekend, poziție ortostatică prelungită, utilizare echipamente optometrice",
    fieldTarget: "description",
  },
]

interface Props {
  jobTitle: string
  onSuggestion: (field: string, text: string) => void
}

export default function JobDescriptionGuide({ jobTitle, onSuggestion }: Props) {
  const [activeStep, setActiveStep] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [generating, setGenerating] = useState(false)

  const currentQ = GUIDE_QUESTIONS[activeStep]

  async function handleGenerate() {
    setGenerating(true)
    try {
      const res = await fetch("/api/v1/jobs/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle,
          criterionName: currentQ.criterionName,
          answers: answers[activeStep] || "",
          fieldTarget: currentQ.fieldTarget,
        }),
      })
      const data = await res.json()
      if (data.suggestion) {
        onSuggestion(currentQ.fieldTarget, data.suggestion)
      }
    } catch (e) {
      console.error("Generate failed:", e)
    }
    setGenerating(false)
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="text-sm font-bold text-slate-900 mb-1">Ghid completare fișă de post</h3>
      <p className="text-[10px] text-slate-400 mb-4">
        Răspundeți la întrebări per criteriu. AI-ul va sugera textul potrivit pentru fișa postului.
      </p>

      {/* Progress */}
      <div className="flex gap-1 mb-5">
        {GUIDE_QUESTIONS.map((q, i) => (
          <button
            key={i}
            onClick={() => setActiveStep(i)}
            className={`flex-1 h-1.5 rounded-full transition-colors cursor-pointer ${
              i === activeStep ? "bg-indigo-500" : i < activeStep && answers[i] ? "bg-emerald-400" : "bg-slate-200"
            }`}
            title={q.criterionName}
          />
        ))}
      </div>

      {/* Current criterion */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase">
            {activeStep + 1}/{GUIDE_QUESTIONS.length}
          </span>
          <span className="text-sm font-semibold text-slate-900">
            {currentQ.criterionName}
          </span>
        </div>

        {/* Questions */}
        <div className="space-y-1.5 mb-4">
          {currentQ.questions.map((q, i) => (
            <p key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
              <span className="text-indigo-400 mt-0.5">•</span>
              {q}
            </p>
          ))}
        </div>

        {/* Answer */}
        <textarea
          value={answers[activeStep] || ""}
          onChange={(e) => setAnswers({ ...answers, [activeStep]: e.target.value })}
          placeholder={currentQ.placeholder}
          rows={3}
          className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 outline-none resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {activeStep > 0 && (
            <button
              onClick={() => setActiveStep(activeStep - 1)}
              className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              ← Anterior
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={generating || !answers[activeStep]?.trim()}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:text-slate-300 cursor-pointer disabled:cursor-default"
          >
            {generating ? "Se generează..." : "Sugerează text →"}
          </button>
          {activeStep < GUIDE_QUESTIONS.length - 1 && (
            <button
              onClick={() => setActiveStep(activeStep + 1)}
              className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg cursor-pointer"
            >
              Următorul
            </button>
          )}
          {activeStep === GUIDE_QUESTIONS.length - 1 && (
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">
              ✓ Completat
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
