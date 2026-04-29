/**
 * Nomenclator COR — Clasificarea Ocupațiilor din România
 *
 * Structura: 10 grupe mari → grupe minore → grupe de bază (cod 4 cifre)
 * Sursa: ISCO-08 adaptat RO (HG nr. 1352/2010, actualizări ulterioare)
 *
 * Folosit la:
 * - Generare AI fișe de post → sugestie cod COR
 * - Autocomplete în portal (client caută ocupația)
 * - Mapping benchmark piață → ocupație standardizată
 * - Conformitate: contracte de muncă necesită cod COR
 */

export interface COREntry {
  code: string     // 4-6 cifre
  name: string     // Denumirea ocupației
  group: string    // Grupa mare (1 cifră)
  groupName: string
}

// Grupe mari COR (nivel 1)
export const COR_GROUPS: Record<string, string> = {
  "1": "Legislatori, înalți funcționari și conducători",
  "2": "Specialiști în diverse domenii de activitate",
  "3": "Tehnicieni și alți specialiști din domeniul tehnic",
  "4": "Funcționari administrativi",
  "5": "Lucrători în domeniul serviciilor",
  "6": "Lucrători calificați în agricultură, silvicultură, pescuit",
  "7": "Meșteșugari și lucrători calificați",
  "8": "Operatori la instalații, mașini și asamblori",
  "9": "Ocupații elementare",
  "0": "Forțele armate",
}

// Nomenclator COR — ocupații frecvente în mediul privat RO
// Cod 4-6 cifre, organizat pe grupe
export const COR_NOMENCLATOR: COREntry[] = [
  // ═══ GRUPA 1: Conducători ═══
  { code: "1112", name: "Directori generali și directori executivi", group: "1", groupName: COR_GROUPS["1"] },
  { code: "1114", name: "Conducători de organizații patronale, cooperatiste și sindicale", group: "1", groupName: COR_GROUPS["1"] },
  { code: "1120", name: "Directori generali și directori executivi", group: "1", groupName: COR_GROUPS["1"] },
  { code: "1211", name: "Directori financiari", group: "1", groupName: COR_GROUPS["1"] },
  { code: "1212", name: "Directori resurse umane", group: "1", groupName: COR_GROUPS["1"] },
  { code: "1213", name: "Directori strategie și planificare", group: "1", groupName: COR_GROUPS["1"] },
  { code: "1219", name: "Directori administrație și suport", group: "1", groupName: COR_GROUPS["1"] },
  { code: "1221", name: "Directori vânzări și marketing", group: "1", groupName: COR_GROUPS["1"] },
  { code: "1222", name: "Directori publicitate și relații publice", group: "1", groupName: COR_GROUPS["1"] },
  { code: "1223", name: "Directori cercetare și dezvoltare", group: "1", groupName: COR_GROUPS["1"] },
  { code: "1311", name: "Directori în agricultură și silvicultură", group: "1", groupName: COR_GROUPS["1"] },
  { code: "1321", name: "Directori în industria prelucrătoare", group: "1", groupName: COR_GROUPS["1"] },
  { code: "1323", name: "Directori în construcții", group: "1", groupName: COR_GROUPS["1"] },
  { code: "1324", name: "Directori în comerț", group: "1", groupName: COR_GROUPS["1"] },
  { code: "1330", name: "Directori în tehnologia informației și comunicații", group: "1", groupName: COR_GROUPS["1"] },
  { code: "1341", name: "Directori de îngrijire a copiilor", group: "1", groupName: COR_GROUPS["1"] },
  { code: "1342", name: "Directori în sănătate", group: "1", groupName: COR_GROUPS["1"] },
  { code: "1343", name: "Directori în învățământ", group: "1", groupName: COR_GROUPS["1"] },
  { code: "1344", name: "Directori în asistență socială", group: "1", groupName: COR_GROUPS["1"] },
  { code: "1345", name: "Directori în educație", group: "1", groupName: COR_GROUPS["1"] },
  { code: "1346", name: "Directori în servicii financiare și asigurări", group: "1", groupName: COR_GROUPS["1"] },
  { code: "1349", name: "Directori în alte servicii", group: "1", groupName: COR_GROUPS["1"] },
  { code: "1411", name: "Manageri de hotel", group: "1", groupName: COR_GROUPS["1"] },
  { code: "1412", name: "Manageri de restaurant", group: "1", groupName: COR_GROUPS["1"] },
  { code: "1420", name: "Manageri în comerțul cu amănuntul și cu ridicata", group: "1", groupName: COR_GROUPS["1"] },
  { code: "1431", name: "Manageri în sport și recreere", group: "1", groupName: COR_GROUPS["1"] },
  { code: "1439", name: "Manageri în alte servicii", group: "1", groupName: COR_GROUPS["1"] },

  // ═══ GRUPA 2: Specialiști ═══
  { code: "2111", name: "Fizicieni și astronomi", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2112", name: "Meteorologi", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2113", name: "Chimisti", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2114", name: "Geologi și geofizicieni", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2120", name: "Matematicieni, actuari și statisticieni", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2131", name: "Biologi, botaniști, zoologi", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2141", name: "Ingineri industriali și de producție", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2142", name: "Ingineri civili", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2143", name: "Ingineri de mediu", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2144", name: "Ingineri mecanici", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2145", name: "Ingineri chimisti", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2146", name: "Ingineri minieri și metalurgiști", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2149", name: "Alți ingineri", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2151", name: "Ingineri electricieni", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2152", name: "Ingineri electroniști", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2153", name: "Ingineri în telecomunicații", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2161", name: "Arhitecți", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2162", name: "Arhitecți peisagiști", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2163", name: "Designeri de produs și de îmbrăcăminte", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2164", name: "Urbaniști și ingineri de trafic", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2165", name: "Cartografi și topografi", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2166", name: "Designeri grafici și multimedia", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2211", name: "Medici generaliști", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2212", name: "Medici specialiști", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2221", name: "Asistenți medicali și moașe", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2250", name: "Medici veterinari", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2261", name: "Stomatologi", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2262", name: "Farmaciști", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2263", name: "Specialiști în sănătate ambientală și medicina muncii", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2264", name: "Kinetoterapeuți", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2265", name: "Dieteticieni și nutriționiști", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2266", name: "Audiologi și logopezi", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2267", name: "Optometriști", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2269", name: "Alți specialiști în sănătate", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2310", name: "Profesori universitari", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2320", name: "Profesori în învățământul secundar", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2330", name: "Profesori în învățământul primar și preșcolar", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2341", name: "Profesori în învățământul primar", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2342", name: "Educatoare", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2351", name: "Specialiști în metode de învățământ", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2352", name: "Profesori pentru nevoi speciale", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2353", name: "Profesori de limbi străine", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2354", name: "Profesori de muzică", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2355", name: "Profesori de artă", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2356", name: "Formatori și instructori", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2359", name: "Alți specialiști în educație", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2411", name: "Contabili", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2412", name: "Consultanți financiari și în investiții", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2413", name: "Analiști financiari", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2421", name: "Analiști de management și organizare", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2422", name: "Specialiști în administrația publică", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2423", name: "Specialiști în resurse umane", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2424", name: "Specialiști în formarea și dezvoltarea personalului", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2431", name: "Specialiști în publicitate și marketing", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2432", name: "Specialiști în relații publice", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2433", name: "Specialiști în vânzări tehnice și medicale", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2434", name: "Specialiști în vânzări TIC", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2511", name: "Analiști de sisteme", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2512", name: "Dezvoltatori de software", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2513", name: "Dezvoltatori web și multimedia", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2514", name: "Programatori", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2519", name: "Alți specialiști IT", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2521", name: "Administratori baze de date", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2522", name: "Administratori de sisteme", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2523", name: "Specialiști rețele de calculatoare", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2529", name: "Specialiști în baze de date și rețele", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2611", name: "Avocați", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2612", name: "Judecători", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2619", name: "Alți specialiști în drept", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2621", name: "Arhiviști și conservatori", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2622", name: "Bibliotecari și specialiști în informare", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2631", name: "Economiști", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2632", name: "Sociologi, antropologi", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2633", name: "Filozofi, istorici, politologi", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2634", name: "Psihologi", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2635", name: "Specialiști în asistență socială", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2636", name: "Specialiști în religie", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2641", name: "Scriitori și autori", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2642", name: "Jurnaliști", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2643", name: "Traducători și interpreți", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2651", name: "Artiști plastici", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2652", name: "Muzicieni, cântăreți, compozitori", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2653", name: "Dansatori și coregrafi", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2654", name: "Regizori și producători de film/tv", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2655", name: "Actori", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2656", name: "Crainici și prezentatori radio/tv", group: "2", groupName: COR_GROUPS["2"] },
  { code: "2659", name: "Alți artiști", group: "2", groupName: COR_GROUPS["2"] },

  // ═══ GRUPA 3: Tehnicieni ═══
  { code: "3111", name: "Tehnicieni în științe chimice și fizice", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3112", name: "Tehnicieni în construcții", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3113", name: "Tehnicieni electricieni", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3114", name: "Tehnicieni electroniști", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3115", name: "Tehnicieni mecanici", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3116", name: "Tehnicieni chimisti", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3119", name: "Alți tehnicieni", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3122", name: "Maiștri în industria prelucrătoare", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3123", name: "Maiștri în construcții", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3131", name: "Operatori centrale electrice", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3132", name: "Operatori stații de incinerare și epurare", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3141", name: "Tehnicieni în biologie", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3151", name: "Ofițeri mecanici maritimi", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3153", name: "Piloți de aviație", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3154", name: "Controlori de trafic aerian", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3211", name: "Tehnicieni de imagistică medicală", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3212", name: "Tehnicieni de laborator medical", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3213", name: "Tehnicieni farmaceuți", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3214", name: "Tehnicieni de protetică dentară", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3221", name: "Asistenți medicali", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3230", name: "Practicieni în medicină tradițională", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3240", name: "Tehnicieni veterinari", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3251", name: "Asistenți stomatologi", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3311", name: "Agenți de bursă", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3312", name: "Analiști de credite", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3313", name: "Tehnicieni contabili", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3314", name: "Tehnicieni statisticieni", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3315", name: "Evaluatori și experți contabili", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3321", name: "Agenți de asigurări", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3322", name: "Reprezentanți comerciali", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3323", name: "Agenți de achiziții", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3324", name: "Brokeri vamali", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3331", name: "Agenți de expediție", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3332", name: "Organizatori conferințe și evenimente", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3333", name: "Agenți de ocupare a forței de muncă", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3334", name: "Agenți imobiliari", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3339", name: "Alți agenți comerciali", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3341", name: "Supervizori în birou", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3342", name: "Secretari juridici", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3343", name: "Secretari administrativi", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3344", name: "Secretari medicali", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3351", name: "Inspectori vamali și de frontieră", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3352", name: "Inspectori fiscali", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3353", name: "Inspectori de protecția muncii", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3354", name: "Inspectori de licențe", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3355", name: "Comisari de poliție", group: "3", groupName: COR_GROUPS["3"] },
  { code: "3359", name: "Alți inspectori", group: "3", groupName: COR_GROUPS["3"] },

  // ═══ GRUPA 4: Funcționari ═══
  { code: "4110", name: "Funcționari în birouri", group: "4", groupName: COR_GROUPS["4"] },
  { code: "4120", name: "Secretari (general)", group: "4", groupName: COR_GROUPS["4"] },
  { code: "4131", name: "Operatori de procesare texte", group: "4", groupName: COR_GROUPS["4"] },
  { code: "4132", name: "Operatori introducere date", group: "4", groupName: COR_GROUPS["4"] },
  { code: "4211", name: "Casieri bancari", group: "4", groupName: COR_GROUPS["4"] },
  { code: "4212", name: "Agenți de pariuri", group: "4", groupName: COR_GROUPS["4"] },
  { code: "4213", name: "Amanetari și creditori", group: "4", groupName: COR_GROUPS["4"] },
  { code: "4214", name: "Colectori de datorii", group: "4", groupName: COR_GROUPS["4"] },
  { code: "4221", name: "Funcționari de turism", group: "4", groupName: COR_GROUPS["4"] },
  { code: "4222", name: "Funcționari la centrele de apel", group: "4", groupName: COR_GROUPS["4"] },
  { code: "4223", name: "Operatori de telefonie", group: "4", groupName: COR_GROUPS["4"] },
  { code: "4224", name: "Recepționeri hotel", group: "4", groupName: COR_GROUPS["4"] },
  { code: "4225", name: "Funcționari la ghișeele de informații", group: "4", groupName: COR_GROUPS["4"] },
  { code: "4226", name: "Recepționeri (general)", group: "4", groupName: COR_GROUPS["4"] },
  { code: "4311", name: "Funcționari contabilitate", group: "4", groupName: COR_GROUPS["4"] },
  { code: "4312", name: "Funcționari statistici și financiari", group: "4", groupName: COR_GROUPS["4"] },
  { code: "4313", name: "Funcționari salarizare", group: "4", groupName: COR_GROUPS["4"] },
  { code: "4321", name: "Funcționari gestiune stocuri", group: "4", groupName: COR_GROUPS["4"] },
  { code: "4322", name: "Funcționari producție", group: "4", groupName: COR_GROUPS["4"] },
  { code: "4323", name: "Funcționari transport", group: "4", groupName: COR_GROUPS["4"] },
  { code: "4411", name: "Funcționari de bibliotecă", group: "4", groupName: COR_GROUPS["4"] },
  { code: "4412", name: "Funcționari poștali", group: "4", groupName: COR_GROUPS["4"] },
  { code: "4413", name: "Codificatori și corectori", group: "4", groupName: COR_GROUPS["4"] },
  { code: "4415", name: "Funcționari arhivă", group: "4", groupName: COR_GROUPS["4"] },
  { code: "4416", name: "Funcționari de personal", group: "4", groupName: COR_GROUPS["4"] },

  // ═══ GRUPA 5: Servicii ═══
  { code: "5111", name: "Însoțitori de bord și stewarzi", group: "5", groupName: COR_GROUPS["5"] },
  { code: "5112", name: "Conductori de tren", group: "5", groupName: COR_GROUPS["5"] },
  { code: "5113", name: "Ghizi turistici", group: "5", groupName: COR_GROUPS["5"] },
  { code: "5120", name: "Bucătari", group: "5", groupName: COR_GROUPS["5"] },
  { code: "5131", name: "Chelneri", group: "5", groupName: COR_GROUPS["5"] },
  { code: "5132", name: "Barmani", group: "5", groupName: COR_GROUPS["5"] },
  { code: "5141", name: "Frizeri", group: "5", groupName: COR_GROUPS["5"] },
  { code: "5142", name: "Cosmeticieni", group: "5", groupName: COR_GROUPS["5"] },
  { code: "5151", name: "Administratori clădiri", group: "5", groupName: COR_GROUPS["5"] },
  { code: "5152", name: "Guvernante", group: "5", groupName: COR_GROUPS["5"] },
  { code: "5153", name: "Administratori de imobile", group: "5", groupName: COR_GROUPS["5"] },
  { code: "5161", name: "Pompieri", group: "5", groupName: COR_GROUPS["5"] },
  { code: "5162", name: "Polițiști", group: "5", groupName: COR_GROUPS["5"] },
  { code: "5163", name: "Gardieni de penitenciar", group: "5", groupName: COR_GROUPS["5"] },
  { code: "5164", name: "Agenți de pază și securitate", group: "5", groupName: COR_GROUPS["5"] },
  { code: "5211", name: "Vânzători în magazine", group: "5", groupName: COR_GROUPS["5"] },
  { code: "5221", name: "Comercianți", group: "5", groupName: COR_GROUPS["5"] },
  { code: "5222", name: "Supervizori în comerț", group: "5", groupName: COR_GROUPS["5"] },
  { code: "5230", name: "Casieri", group: "5", groupName: COR_GROUPS["5"] },
  { code: "5311", name: "Îngrijitori de copii", group: "5", groupName: COR_GROUPS["5"] },
  { code: "5312", name: "Asistenți educatori", group: "5", groupName: COR_GROUPS["5"] },
  { code: "5321", name: "Asistenți în sănătate", group: "5", groupName: COR_GROUPS["5"] },
  { code: "5322", name: "Îngrijitori la domiciliu", group: "5", groupName: COR_GROUPS["5"] },
  { code: "5329", name: "Alți lucrători în îngrijirea sănătății", group: "5", groupName: COR_GROUPS["5"] },

  // ═══ GRUPA 7: Meșteșugari ═══
  { code: "7111", name: "Constructori de case", group: "7", groupName: COR_GROUPS["7"] },
  { code: "7112", name: "Zidari", group: "7", groupName: COR_GROUPS["7"] },
  { code: "7113", name: "Pietruitori și tăietori de piatră", group: "7", groupName: COR_GROUPS["7"] },
  { code: "7114", name: "Betonieri și armatori", group: "7", groupName: COR_GROUPS["7"] },
  { code: "7115", name: "Dulgheri și tâmplari", group: "7", groupName: COR_GROUPS["7"] },
  { code: "7119", name: "Alți muncitori în construcții", group: "7", groupName: COR_GROUPS["7"] },
  { code: "7121", name: "Acoperitori", group: "7", groupName: COR_GROUPS["7"] },
  { code: "7122", name: "Pardositori și faianțari", group: "7", groupName: COR_GROUPS["7"] },
  { code: "7123", name: "Tencuitori", group: "7", groupName: COR_GROUPS["7"] },
  { code: "7124", name: "Izolatori", group: "7", groupName: COR_GROUPS["7"] },
  { code: "7125", name: "Geamgii", group: "7", groupName: COR_GROUPS["7"] },
  { code: "7126", name: "Instalatori și montatori țevi", group: "7", groupName: COR_GROUPS["7"] },
  { code: "7127", name: "Mecanici de climatizare și refrigerare", group: "7", groupName: COR_GROUPS["7"] },
  { code: "7131", name: "Zugravi și vopsitori", group: "7", groupName: COR_GROUPS["7"] },
  { code: "7211", name: "Turnători", group: "7", groupName: COR_GROUPS["7"] },
  { code: "7212", name: "Sudori și tăietori cu flacără", group: "7", groupName: COR_GROUPS["7"] },
  { code: "7213", name: "Tinichigii", group: "7", groupName: COR_GROUPS["7"] },
  { code: "7214", name: "Pregătitori și montatori structuri metalice", group: "7", groupName: COR_GROUPS["7"] },
  { code: "7215", name: "Montatori cablaje și cablagii", group: "7", groupName: COR_GROUPS["7"] },
  { code: "7221", name: "Forjeri", group: "7", groupName: COR_GROUPS["7"] },
  { code: "7222", name: "Constructori de scule", group: "7", groupName: COR_GROUPS["7"] },
  { code: "7223", name: "Reglori și operatori mașini-unelte", group: "7", groupName: COR_GROUPS["7"] },
  { code: "7224", name: "Polizori și ascuțitori", group: "7", groupName: COR_GROUPS["7"] },
  { code: "7231", name: "Mecanici auto", group: "7", groupName: COR_GROUPS["7"] },
  { code: "7232", name: "Mecanici avioane", group: "7", groupName: COR_GROUPS["7"] },
  { code: "7233", name: "Mecanici mașini agricole și industriale", group: "7", groupName: COR_GROUPS["7"] },
  { code: "7311", name: "Mecanici de precizie", group: "7", groupName: COR_GROUPS["7"] },
  { code: "7411", name: "Electricieni în construcții", group: "7", groupName: COR_GROUPS["7"] },
  { code: "7412", name: "Electricieni și montatori instalații electrice", group: "7", groupName: COR_GROUPS["7"] },
  { code: "7413", name: "Montatori și reparatori linii electrice", group: "7", groupName: COR_GROUPS["7"] },
  { code: "7421", name: "Mecanici și reparatori echipamente electronice", group: "7", groupName: COR_GROUPS["7"] },
  { code: "7422", name: "Instalatori și reparatori TIC", group: "7", groupName: COR_GROUPS["7"] },

  // ═══ GRUPA 8: Operatori ═══
  { code: "8100", name: "Operatori la instalații fixe și mașini", group: "8", groupName: COR_GROUPS["8"] },
  { code: "8111", name: "Operatori exploatări miniere", group: "8", groupName: COR_GROUPS["8"] },
  { code: "8112", name: "Operatori prelucrare minerale", group: "8", groupName: COR_GROUPS["8"] },
  { code: "8113", name: "Sondori și lucrători assimilați", group: "8", groupName: COR_GROUPS["8"] },
  { code: "8121", name: "Operatori prelucrare metale", group: "8", groupName: COR_GROUPS["8"] },
  { code: "8122", name: "Operatori tratamente termice", group: "8", groupName: COR_GROUPS["8"] },
  { code: "8131", name: "Operatori industrie chimică", group: "8", groupName: COR_GROUPS["8"] },
  { code: "8141", name: "Operatori industrie cauciuc", group: "8", groupName: COR_GROUPS["8"] },
  { code: "8142", name: "Operatori industrie mase plastice", group: "8", groupName: COR_GROUPS["8"] },
  { code: "8143", name: "Operatori industrie hârtie", group: "8", groupName: COR_GROUPS["8"] },
  { code: "8151", name: "Operatori textile", group: "8", groupName: COR_GROUPS["8"] },
  { code: "8152", name: "Operatori mașini de cusut", group: "8", groupName: COR_GROUPS["8"] },
  { code: "8160", name: "Operatori industrie alimentară", group: "8", groupName: COR_GROUPS["8"] },
  { code: "8171", name: "Operatori linie de asamblare", group: "8", groupName: COR_GROUPS["8"] },
  { code: "8181", name: "Operatori sticlă și ceramică", group: "8", groupName: COR_GROUPS["8"] },
  { code: "8182", name: "Operatori mașini cu abur", group: "8", groupName: COR_GROUPS["8"] },
  { code: "8183", name: "Operatori mașini de ambalat", group: "8", groupName: COR_GROUPS["8"] },
  { code: "8189", name: "Alți operatori", group: "8", groupName: COR_GROUPS["8"] },
  { code: "8311", name: "Mecanici de locomotivă", group: "8", groupName: COR_GROUPS["8"] },
  { code: "8322", name: "Șoferi autocar și autobuz", group: "8", groupName: COR_GROUPS["8"] },
  { code: "8331", name: "Conducători autobuze și tramvaie", group: "8", groupName: COR_GROUPS["8"] },
  { code: "8332", name: "Șoferi camioane grele", group: "8", groupName: COR_GROUPS["8"] },
  { code: "8341", name: "Operatori mașini agricole mobile", group: "8", groupName: COR_GROUPS["8"] },
  { code: "8342", name: "Operatori utilaje terasiere", group: "8", groupName: COR_GROUPS["8"] },
  { code: "8343", name: "Macaragii", group: "8", groupName: COR_GROUPS["8"] },
  { code: "8344", name: "Operatori motostivuitoare", group: "8", groupName: COR_GROUPS["8"] },

  // ═══ GRUPA 9: Ocupații elementare ═══
  { code: "9111", name: "Menajeră și personal casnic", group: "9", groupName: COR_GROUPS["9"] },
  { code: "9112", name: "Curățitori și spălători", group: "9", groupName: COR_GROUPS["9"] },
  { code: "9121", name: "Spălători de mașini", group: "9", groupName: COR_GROUPS["9"] },
  { code: "9122", name: "Spălători de vase", group: "9", groupName: COR_GROUPS["9"] },
  { code: "9123", name: "Spălători de geamuri", group: "9", groupName: COR_GROUPS["9"] },
  { code: "9129", name: "Alți curățitori", group: "9", groupName: COR_GROUPS["9"] },
  { code: "9211", name: "Muncitori necalificați în agricultură", group: "9", groupName: COR_GROUPS["9"] },
  { code: "9312", name: "Muncitori necalificați în construcții", group: "9", groupName: COR_GROUPS["9"] },
  { code: "9313", name: "Muncitori necalificați în industrie", group: "9", groupName: COR_GROUPS["9"] },
  { code: "9321", name: "Ambalatori manual", group: "9", groupName: COR_GROUPS["9"] },
  { code: "9329", name: "Alți muncitori necalificați în industrie", group: "9", groupName: COR_GROUPS["9"] },
  { code: "9411", name: "Preparatori fast food", group: "9", groupName: COR_GROUPS["9"] },
  { code: "9412", name: "Ajutori de bucătar", group: "9", groupName: COR_GROUPS["9"] },
  { code: "9510", name: "Lucrători stradali", group: "9", groupName: COR_GROUPS["9"] },
  { code: "9520", name: "Vânzători ambulanți", group: "9", groupName: COR_GROUPS["9"] },
  { code: "9611", name: "Colectori de gunoi", group: "9", groupName: COR_GROUPS["9"] },
  { code: "9612", name: "Sortatori de deșeuri", group: "9", groupName: COR_GROUPS["9"] },
  { code: "9621", name: "Mesageri, comisionari", group: "9", groupName: COR_GROUPS["9"] },
  { code: "9622", name: "Muncitori necalificați diverse", group: "9", groupName: COR_GROUPS["9"] },
  { code: "9623", name: "Cititori contoare și colectori", group: "9", groupName: COR_GROUPS["9"] },
  { code: "9629", name: "Alți muncitori necalificați", group: "9", groupName: COR_GROUPS["9"] },
]

/**
 * Caută COR după text (titlu post, ocupație) — fuzzy match
 */
export function searchCOR(query: string, limit: number = 10): COREntry[] {
  const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  return COR_NOMENCLATOR
    .filter(e => {
      const name = e.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      return name.includes(q) || e.code.startsWith(q)
    })
    .slice(0, limit)
}

/**
 * Caută COR exact pe cod
 */
export function getCORByCode(code: string): COREntry | undefined {
  return COR_NOMENCLATOR.find(e => e.code === code)
}

/**
 * Sugerează cod COR pe baza titlului postului (mapping heuristic)
 */
export function suggestCOR(jobTitle: string): COREntry[] {
  const t = jobTitle.toLowerCase()

  // Mapping direct titlu → cod COR
  const TITLE_COR_MAP: Array<{ keywords: string[]; code: string }> = [
    { keywords: ["director general", "ceo", "administrator"], code: "1120" },
    { keywords: ["director financiar", "cfo"], code: "1211" },
    { keywords: ["director hr", "director resurse umane"], code: "1212" },
    { keywords: ["director marketing", "director vanzari"], code: "1221" },
    { keywords: ["director it", "cto", "director tehnic"], code: "1330" },
    { keywords: ["director comercial"], code: "1324" },
    { keywords: ["manager hotel"], code: "1411" },
    { keywords: ["manager restaurant"], code: "1412" },
    { keywords: ["contabil", "economist"], code: "2411" },
    { keywords: ["analist financiar", "controller"], code: "2413" },
    { keywords: ["specialist hr", "specialist resurse umane"], code: "2423" },
    { keywords: ["specialist marketing", "marketing manager"], code: "2431" },
    { keywords: ["specialist pr", "relații publice"], code: "2432" },
    { keywords: ["programator", "developer", "software"], code: "2514" },
    { keywords: ["analist sisteme", "business analyst"], code: "2511" },
    { keywords: ["admin sisteme", "sysadmin", "devops"], code: "2522" },
    { keywords: ["avocat", "jurist", "consilier juridic"], code: "2611" },
    { keywords: ["psiholog"], code: "2634" },
    { keywords: ["asistent social"], code: "2635" },
    { keywords: ["jurnalist", "reporter"], code: "2642" },
    { keywords: ["traducator", "interpret"], code: "2643" },
    { keywords: ["designer grafic"], code: "2166" },
    { keywords: ["arhitect"], code: "2161" },
    { keywords: ["inginer mecanic"], code: "2144" },
    { keywords: ["inginer civil", "inginer constructii"], code: "2142" },
    { keywords: ["inginer electric"], code: "2151" },
    { keywords: ["medic"], code: "2212" },
    { keywords: ["asistent medical", "asistenta medicala"], code: "3221" },
    { keywords: ["farmacist"], code: "2262" },
    { keywords: ["profesor universitar", "lector"], code: "2310" },
    { keywords: ["profesor", "invatator"], code: "2341" },
    { keywords: ["educatoare"], code: "2342" },
    { keywords: ["reprezentant comercial", "agent vanzari"], code: "3322" },
    { keywords: ["agent asigurari"], code: "3321" },
    { keywords: ["secretar", "asistent manager"], code: "4120" },
    { keywords: ["operator date", "data entry"], code: "4132" },
    { keywords: ["functionar contabilitate"], code: "4311" },
    { keywords: ["functionar salarizare", "payroll"], code: "4313" },
    { keywords: ["casier"], code: "5230" },
    { keywords: ["vanzator", "consultant vanzari"], code: "5211" },
    { keywords: ["bucatar", "chef"], code: "5120" },
    { keywords: ["chelner", "ospatar"], code: "5131" },
    { keywords: ["barman"], code: "5132" },
    { keywords: ["agent paza", "bodyguard", "securitate"], code: "5164" },
    { keywords: ["electrician"], code: "7411" },
    { keywords: ["sudor"], code: "7212" },
    { keywords: ["mecanic auto"], code: "7231" },
    { keywords: ["sofer", "conducator auto"], code: "8332" },
    { keywords: ["operator cnc", "strungar", "frezor"], code: "7223" },
    { keywords: ["macaragiu"], code: "8343" },
    { keywords: ["motostivuitorist"], code: "8344" },
    { keywords: ["receptioner"], code: "4226" },
  ]

  const matches: COREntry[] = []
  for (const mapping of TITLE_COR_MAP) {
    if (mapping.keywords.some(kw => t.includes(kw))) {
      const entry = getCORByCode(mapping.code)
      if (entry) matches.push(entry)
    }
  }

  // Dacă nu găsim match direct, facem search fuzzy
  if (matches.length === 0) {
    return searchCOR(jobTitle, 5)
  }

  return matches
}
