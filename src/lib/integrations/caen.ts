/**
 * caen.ts — mapare COD CAEN → industrie + denumire scurtă
 *
 * Acoperim cele mai frecvente diviziuni CAEN Rev. 2 (2 cifre).
 * Pentru CAEN cu 4 cifre, folosim primele 2 ca pivot.
 *
 * Industriile mapate la INDUSTRY_OPTIONS din CompanyProfileForm pentru
 * compatibilitate cu sistemul existent.
 */

export interface CaenInfo {
  code: string // 4 cifre
  division: string // 2 cifre
  name: string // denumire scurtă RO
  industry: string // categorie din INDUSTRY_OPTIONS
}

const DIVISION_TO_INDUSTRY: Record<string, { name: string; industry: string }> = {
  // Agricultură, silvicultură, pescuit
  "01": { name: "Agricultură și activități anexe", industry: "Altele" },
  "02": { name: "Silvicultură și exploatare forestieră", industry: "Altele" },
  "03": { name: "Pescuit și acvacultură", industry: "Altele" },

  // Industrie extractivă
  "05": { name: "Extracția cărbunelui", industry: "Producție" },
  "06": { name: "Extracția petrolului și gazelor naturale", industry: "Producție" },
  "07": { name: "Extracția minereurilor metalifere", industry: "Producție" },
  "08": { name: "Alte activități extractive", industry: "Producție" },

  // Industrie prelucrătoare
  "10": { name: "Industria alimentară", industry: "Alimentar" },
  "11": { name: "Fabricarea băuturilor", industry: "Alimentar" },
  "13": { name: "Fabricarea produselor textile", industry: "Producție" },
  "14": { name: "Fabricarea articolelor de îmbrăcăminte", industry: "Producție" },
  "15": { name: "Tăbăcirea pieilor și încălțăminte", industry: "Producție" },
  "16": { name: "Prelucrarea lemnului", industry: "Producție" },
  "17": { name: "Fabricarea hârtiei și produselor din hârtie", industry: "Producție" },
  "18": { name: "Tipărire și reproducere pe suporturi", industry: "Producție" },
  "20": { name: "Fabricarea substanțelor și produselor chimice", industry: "Producție" },
  "21": { name: "Fabricarea produselor farmaceutice", industry: "Sănătate" },
  "22": { name: "Fabricarea articolelor din cauciuc și mase plastice", industry: "Producție" },
  "23": { name: "Fabricarea altor produse din minerale nemetalice", industry: "Producție" },
  "24": { name: "Industria metalurgică", industry: "Producție" },
  "25": { name: "Fabricarea produselor metalice", industry: "Producție" },
  "26": { name: "Fabricarea calculatoarelor și produselor electronice", industry: "IT & Software" },
  "27": { name: "Fabricarea echipamentelor electrice", industry: "Producție" },
  "28": { name: "Fabricarea de mașini, utilaje și echipamente", industry: "Producție" },
  "29": { name: "Fabricarea autovehiculelor", industry: "Producție" },
  "30": { name: "Fabricarea altor mijloace de transport", industry: "Producție" },
  "31": { name: "Fabricarea de mobilă", industry: "Producție" },
  "32": { name: "Alte activități industriale", industry: "Producție" },
  "33": { name: "Repararea și instalarea mașinilor și echipamentelor", industry: "Producție" },

  // Energie, apă
  "35": { name: "Producția și furnizarea de energie", industry: "Producție" },
  "36": { name: "Captarea, tratarea și distribuția apei", industry: "Producție" },
  "37": { name: "Colectarea și epurarea apelor uzate", industry: "Altele" },
  "38": { name: "Colectarea, tratarea și eliminarea deșeurilor", industry: "Altele" },

  // Construcții
  "41": { name: "Construcții de clădiri", industry: "Construcții" },
  "42": { name: "Lucrări de construcții civile", industry: "Construcții" },
  "43": { name: "Lucrări speciale de construcții", industry: "Construcții" },

  // Comerț
  "45": { name: "Comerț cu autovehicule și piese auto", industry: "Retail" },
  "46": { name: "Comerț cu ridicata", industry: "Retail" },
  "47": { name: "Comerț cu amănuntul", industry: "Retail" },

  // Transport, depozitare
  "49": { name: "Transporturi terestre", industry: "Transport & Logistică" },
  "50": { name: "Transporturi pe apă", industry: "Transport & Logistică" },
  "51": { name: "Transporturi aeriene", industry: "Transport & Logistică" },
  "52": { name: "Depozitare și activități auxiliare transportului", industry: "Transport & Logistică" },
  "53": { name: "Activități de poștă și curierat", industry: "Transport & Logistică" },

  // HoReCa
  "55": { name: "Hoteluri și alte facilități de cazare", industry: "Altele" },
  "56": { name: "Restaurante și alte servicii de alimentație", industry: "Altele" },

  // Informație și comunicații
  "58": { name: "Activități de editare", industry: "IT & Software" },
  "59": { name: "Activități de producție cinematografică, video, TV", industry: "Altele" },
  "60": { name: "Activități de difuzare și transmitere", industry: "Telecomunicații" },
  "61": { name: "Telecomunicații", industry: "Telecomunicații" },
  "62": { name: "Activități de servicii informatice (programare)", industry: "IT & Software" },
  "63": { name: "Activități de servicii informaționale", industry: "IT & Software" },

  // Servicii financiare
  "64": { name: "Intermedieri financiare", industry: "Servicii financiare" },
  "65": { name: "Asigurări și fonduri de pensii", industry: "Servicii financiare" },
  "66": { name: "Activități auxiliare intermedierilor financiare", industry: "Servicii financiare" },

  // Tranzacții imobiliare
  "68": { name: "Tranzacții imobiliare", industry: "Altele" },

  // Activități profesionale, științifice
  "69": { name: "Activități juridice și de contabilitate", industry: "Servicii financiare" },
  "70": { name: "Activități ale direcțiilor și consultanță în management", industry: "Altele" },
  "71": { name: "Activități de arhitectură, inginerie, testări", industry: "Altele" },
  "72": { name: "Cercetare-dezvoltare", industry: "Altele" },
  "73": { name: "Publicitate și activități de studiere a pieței", industry: "Altele" },
  "74": { name: "Alte activități profesionale, științifice", industry: "Altele" },
  "75": { name: "Activități veterinare", industry: "Sănătate" },

  // Activități administrative și servicii suport
  "77": { name: "Închiriere și leasing", industry: "Altele" },
  "78": { name: "Activități ale agențiilor de plasare a forței de muncă", industry: "Altele" },
  "79": { name: "Activități ale agențiilor turistice", industry: "Altele" },
  "80": { name: "Activități de investigații și protecție", industry: "Altele" },
  "81": { name: "Activități de servicii pentru clădiri și amenajări", industry: "Altele" },
  "82": { name: "Activități de secretariat și suport pentru afaceri", industry: "Altele" },

  // Administrație publică
  "84": { name: "Administrație publică și apărare", industry: "Altele" },

  // Învățământ
  "85": { name: "Învățământ", industry: "Educație" },

  // Sănătate
  "86": { name: "Activități de asistență medicală", industry: "Sănătate" },
  "87": { name: "Servicii de asistență medicală cu cazare", industry: "Sănătate" },
  "88": { name: "Activități de asistență socială fără cazare", industry: "Sănătate" },

  // Activități de spectacole, culturale
  "90": { name: "Activități de creație și interpretare artistică", industry: "Altele" },
  "91": { name: "Activități ale bibliotecilor, arhivelor și muzeelor", industry: "Altele" },
  "92": { name: "Activități de jocuri de noroc și pariuri", industry: "Altele" },
  "93": { name: "Activități sportive, recreative și distractive", industry: "Altele" },

  // Alte servicii
  "94": { name: "Activități asociative", industry: "Altele" },
  "95": { name: "Reparații de calculatoare, articole personale", industry: "Altele" },
  "96": { name: "Alte activități de servicii", industry: "Altele" },
}

/**
 * Returnează informații complete despre un cod CAEN.
 */
export function lookupCAEN(code: string): CaenInfo | null {
  if (!code) return null
  const cleaned = code.replace(/\D/g, "")
  if (cleaned.length < 2) return null

  const division = cleaned.slice(0, 2)
  const info = DIVISION_TO_INDUSTRY[division]
  if (!info) {
    return {
      code: cleaned.padEnd(4, "0"),
      division,
      name: `Activitate cod ${division}`,
      industry: "Altele",
    }
  }

  return {
    code: cleaned.padEnd(4, "0"),
    division,
    name: info.name,
    industry: info.industry,
  }
}
