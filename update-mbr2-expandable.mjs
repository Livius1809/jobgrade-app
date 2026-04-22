import pg from "pg";
const pool = new pg.Pool({ connectionString: process.env.PROD_DB, ssl: { rejectUnauthorized: false } });

const content = `# Analiza decalajului salarial

---

## 1. CONTEXTUL CARE GENEREAZĂ NEVOIA (De unde pornim)

România intră în noua eră a transparenței salariale. Directiva Europeană 2023/970 schimbă fundamental regulile jocului; începând din 2026, companiile cu peste 100 angajați trebuie să raporteze diferențele salariale dintre bărbați și femei. Nu mai este vorba despre "politici de diversitate", ci despre demonstrarea matematică a echității.

În plus față de acest aspect, generația digitală manifestă altfel de așteptări. Angajații de azi nu acceptă răspunsuri vagi la întrebări concrete despre salarii. Ei văd transparența salarială ca pe un drept fundamental, nu ca pe un favor organizațional.

Provocarea reală nu este numai de natură tehnică; ci devine evidentă la nivel cultural. Cum treci de la "așa am făcut mereu" la "iată dovada că suntem echitabili"?

---EXTINS---

### Contextul european

Uniunea Europeană identifică decalajul salarial de gen ca pe una dintre principalele bariere în realizarea egalității de șanse. Cu un decalaj salarial mediu european de 12,7%, presiunea pentru măsuri concrete devine inevitabilă. Deși România se situează sub acest nivel cu 3,6% în varianta oficială, există suspiciuni rezonabile că cifra reală ar fi mult mai mare tocmai din cauza lipsei de... transparență.

### Piața muncii și noile generații

Piața muncii din România se confruntă cu cea mai acută criză de talente din ultimele decenii. În această competiție pentru angajați calificați, transparența salarială devine un diferențiator major. Generația Millennials și Gen Z nu mai acceptă răspunsuri evazive la întrebări concrete despre remunerare. Ei cercetează salariile pe Glassdoor înainte de interviu, negociază pe baza benchmarkurilor de piață și schimbă locurile de muncă când descoperă inechități.

### Provocarea culturală

Organizațiile românești s-au dezvoltat într-o cultură a discreției salariale, în care "nu se vorbește despre bani" era regula nescrisă. Tranziția către transparența obligatorie prin lege creează anxietate la toate nivelurile: managementul se teme de conflicte, HR-ul se teme de complexitate, angajații se tem să afle adevăruri incomode.

### Urgența legală

Din iunie 2026, orice companie cu peste 100 angajați va trebui să publice rapoarte anuale privitoare la decalajul salarial, să justifice diferențele salariale peste 5% și să implementeze planuri de corecție pentru inechitățile identificate. Nu e o recomandare, e o obligație legală cu sancțiuni și consecințe de reputație.

---

## 2. NEVOIA DE SCHIMBARE ȘI IMPACTUL ORGANIZAȚIONAL (Ce se întâmplă dacă nu acționăm)

Inegalitatea salarială de gen nu e doar o problemă de imagine, e o gaură neagră în bugetul organizațional. Femei plătite sub potențial înseamnă talente subutilizate, bărbați compensați excesiv înseamnă bugete ineficiente, iar lipsa transparenței înseamnă decizii HR bazate pe intuiție, nu pe date.

Impactul se vede în toate colțurile organizației: HR petrece ore explicând de ce "nu poate spune salariile celorlalți", managerii evită conversațiile despre promovări (pentru că nu au criterii clare, sau pentru că "știu ei mai bine cine merită și cine nu"), angajații talentați pleacă fără să explice de ce, iar bugetele salariale cresc haotic, fără o logică bazată pe coordonate strategice.

Organizația devine prizoniera propriilor inconsistențe și toată lumea simte că ceva nu funcționează cum trebuie.

---EXTINS---

### Riscurile care se acumulează

Riscurile legale se acumulează progresiv. Într-un mediu în care angajații devin din ce în ce mai conștienți de drepturile lor, lipsa unor metodologii obiective de stabilire a salariilor transformă orice decizie de HR într-o potențială sursă de litigii.

Brandul de angajator suferă pe termen lung. În piața talentelor din România, transparența salarială nu mai e un "nice to have", devine un criteriu de selecție. Candidații întreabă direct în interviuri despre politica salarială, iar răspunsurile vagi sunt interpretate ca semnale de alarmă.

### Impactul financiar real

Impactul financiar depășește costurile evidente: bugete salariale alocate ineficient (unii angajați supracompensați, alții subevaluați), pierderea investițiilor în formare (angajații talentați formați pleacă pentru salarii echitabile), costurile recrutării repetate și impactul asupra productivității echipelor (tensiuni interne, demotivare, conflict latent).

---

## 3. CE SE ÎNTÂMPLĂ DACĂ AMÂNI (Costul amânării)

Amânarea nu îngheață problema și nici nu face ca aceasta să se rezolve de la sine, ci de fapt, o amplifică. Fiecare lună de întârziere înseamnă mai multe inechități acumulate, mai multe decizii salariale contestabile, mai multe situații care vor trebui "corectate" sub presiunea timpului.

Din 2026, fiecare raport privind decalajul salarial va fi public. Imaginează-ți că descoperi că ai un decalaj salarial de 23% și ai 60 de zile să îl explici. Sau că realizezi că nu ai metodologia necesară să demonstrezi cu argumente, tuturor factorilor interesați, faptul că promovările sunt corelate cu performanța obținută de salariați.

Costul real al amânării nu e dat de suma sancțiunilor potențiale, ci de prejudiciul cauzat de scăderea credibilității organizaționale într-o piață unde transparența devine avantaj competitiv.

---EXTINS---

### Pierderea controlului

Când raportul privind decalajul salarial e făcut sub presiune, concentrarea se deplasează de la "înțelegerea și îmbunătățirea" la "minimizarea daunelor." În loc să construiești o cultură transparentă proactiv, ajungi să reacționezi defensiv la descoperiri incomode.

### Impactul asupra culturii

Angajații care descoperă că organizația "știa dar nu a făcut nimic" timp de ani, dezvoltă o neîncredere sistemică în conducere. Managerii care trebuie să implementeze corecții masive în timp record pierd credibilitatea în fața echipelor lor. HR-ul devine "departamentul care ascunde problemele" în loc să fie partenerul strategic pentru dezvoltarea oamenilor.

### Avantajul competitiv pierdut

Competitorii care acționează proactiv vor folosi transparența ca avantaj competitiv. "La noi, transparența salarială e garantată prin metodologie obiectivă" devine un argument de promovare care nu poate fi contracarat cu "și la noi e avantajos, dar nu avem datele să o demonstrăm."

---

## 4. DE CE AM CREAT ACEST SERVICIU (Motivația noastră)

Pentru că vedem tot mai multe organizații prinse în capcana propriilor bune intenții. Manageri care cred sincer că sunt echitabili, dar nu pot susține cu argumente acest lucru. Femei talentate care se îndoiesc de propria capacitate profesională și care aleg să facă un pas în afara companiei din cauza opacității sistemului salarial. Sau bărbați care se simt vinovați pentru privilegii pe care nu le cer explicit.

Nu vorbim despre culpabilizare, ci despre clarificare. Nu despre penalizare, ci despre înțelegere și despre crearea unei referințe la care performanța să se raporteze în mod corect.

Credem că echitatea salarială de gen este posibilă, atunci când organizația își înțelege propriile date și are instrumentele să acționeze pe baza lor.

Fiecare analiză a decalajului salarial, pe care o producem, e de fapt o oglindă: organizația se vede așa cum este cu adevărat, nu cum își imaginează că este.

---EXTINS---

### Motivația profundă

Motivația noastră profundă e să transformăm "problema decalajului salarial" din sursă de anxietate organizațională în oportunitate de construire a unei culturi bazate pe transparență, echitate și respect reciproc. Nu vrem să fim "doctori" care diagnostichează bolnavi, vrem să fim "antrenori" care ajută organizații sănătoase să devină și mai performante.

### Valorile care ne ghidează

Valorile care ne ghidează sunt simple: respectul pentru munca fiecărei persoane, încrederea că transparența e întotdeauna superioară opacității, convingerea că organizațiile românești pot fi pioniere ale schimbării pozitive, nu victimele ei.

---

## 5. CUM VĂ AJUTĂ CONCRET ACEST SERVICIU (Ce obțineți)

Analiza decalajului salarial transformă întrebarea "Există vreun decalaj salarial la noi în organizație?" în răspunsul "Da, iată exact unde, cât este și de ce."

Platforma analizează salariile pe funcții echivalente, în funcție de variabilele relevante (experiență, performanță, vechime) și produce rapoarte conforme cu cerințele Directivei EU.

Rezultatul nu e doar o cifră, e o hartă detaliată a organizației tale din punctul de vedere al salariilor existente. Vezi care departamente înregistrează decalaje, care sunt nivelurile ierarhice afectate și în jurul căror tipuri de roluri se concentrează inechitățile. Mai important, vezi care diferențe sunt justificate în corelație cu performanța obținută și care nu.

Platforma generează automat planul de acțiune: care salarii necesită ajustare, când și în ce ordine, cu ce impact bugetar și cu ce rezultat final asupra decalajului salarial la nivel de organizație.

---EXTINS---

### Ce face platforma în detaliu

Platforma pornește de la fundamentele metodologice ale evaluării posturilor de lucru și aplică analize statistice pentru a identifica pattern-urile salariale reale. Sistemul procesează informația automat luând în calcul variabilele relevante: experiența în rol, performanța individuală (dacă datele sunt disponibile), vechimea în organizație, nivelul educațional, certificările specifice industriei, responsabilitățile adiționale documentate.

### Documentația de conformitate

Platforma generează automat documentația de conformitate cerută de Directiva EU: raportul anual privind decalajul salarial, justificările pentru diferențele peste 5%, planurile de acțiune pentru corectare și evidența măsurilor implementate.

### Monitorizare continuă

Funcționalitatea de monitorizare continuă transformă analiza decalajului salarial dintr-un exercițiu anual într-un proces integrat în fluxurile HR. Platforma alertează automat când deciziile salariale noi creează sau agravează inechități, când anumite departamente dezvoltă tipare suspicioase sau când indicatorii de transparență se deteriorează.

---

## 6. CE AȘTEPTĂRI AR PUTEA AVEA CLIENTUL (Așteptări realiste)

Clientul vrea să știe adevărul, dar să aibă și planul pentru a-l îmbunătăți. Se așteaptă să descopere că unele prejudecăți pe care le credea "doar percepții" sunt de fapt realități măsurabile. Și vrea instrumentele să le corecteze fără să creeze haos organizațional.

Așteaptă să transforme o "problemă de imagine" într-o "oportunitate de optimizare." Să treacă de la defensivă ("Nu avem discriminare") la proactivitate ("Iată dovada echității noastre").

Clientul își dorește să aibă confortul conferit de transparența organizațională pe care să o poată folosi ca avantaj competitiv în atragerea talentelor.

---EXTINS---

### Practicabilitate

Clientul înțelege că decalajul salarial nu poate fi corectat imediat fără să creeze probleme bugetare sau tensiuni organizaționale. Se așteaptă la planuri de implementare graduale, sustenabile financiar și acceptabile cultural pentru organizația sa.

### Confortul transparenței

Așteptarea finală, dar poate cea mai importantă, e să se simtă confortabil în organizația pe care o conduce. Să poată afirma cu încredere că organizația sa reprezintă un spațiu în care fiecare persoană e valorizată echitabil raportat la contribuția sa, indiferent de gen, și că această echitate e demonstrabilă prin date obiective, nu doar declarată prin politici bine intenționate.

---

## 7. CINE SUNTEM

Suntem echipa care înțelege că în spatele fiecărei statistici stă o poveste umană. Nu suntem consultanții care vin cu soluții preconfecționate, suntem partenerii care construiesc împreună cu tine instrumentele de care organizația ta are nevoie pentru propriul context.

Credem că transparența salarială nu e o modă tranzitorie, e viitorul relațiilor de muncă. Și credem că organizațiile românești pot fi pioniere ale acestei transformări, nu victimele ei.

---EXTINS---

### Abordarea noastră

Nu suntem "experții" care vin să vă spună ce faceți greșit, suntem facilitatorii care vă ajută să descoperiți singuri adevărul despre organizația voastră și să construiți singuri soluțiile potrivite pentru propriul context. Instrumentele noastre sunt puternice, dar atitudinea care ne guvernează acțiunile este de modestie: organizația voastră se cunoaște cel mai bine pe ea însăși (70% din informațiile necesare progresului unei organizații se află în interiorul său), noi doar oferim oglinzile și metodologiile pentru această cunoaștere.

JobGrade nu e doar o platformă, e compania care te ajută să construiești cultura organizațională la care aspiri, dar pe care poate nu știi că o meriți.

**Contact:** Pentru o discuție despre cum analiza decalajului salarial poate ajuta organizația ta, completează formularul de pe [jobgrade.ro/b2b/je](/b2b/je).
`;

await pool.query("UPDATE agent_tasks SET result = $1 WHERE id = $2", [content, 'ed6b9e46-936f-48aa-a00c-66cfe4b5c055']);
console.log("MB-R2 UPDATED with expandable sections:", content.length, "chars");

await pool.end();

await pool.query("UPDATE agent_tasks SET result = $1 WHERE id = $2", [content, 'ed6b9e46-936f-48aa-a00c-66cfe4b5c055']);
console.log("MB-R2 UPDATED with expandable sections:", content.length, "chars");

await pool.end();
