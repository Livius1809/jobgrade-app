/**
 * guide-visual-identity.ts — Identitatea vizuală a Ghidului JobGrade
 *
 * Cum ARATĂ persoana care are vocea definită în voice-persona.ts.
 * Folosit pentru: avatar, animații, video, prezentări, materiale marketing.
 *
 * Principiu: imaginea trebuie să transmită EXACT ce transmite vocea —
 * competență fără aroganță, căldură fără familiaritate, profesionalism natural.
 */

// ═══════════════════════════════════════════════════════════════
// IDENTITATE VIZUALĂ — descriere pentru generare AI (DALL-E / Midjourney)
// ═══════════════════════════════════════════════════════════════

export const GUIDE_VISUAL = {
  /** Descriere generală */
  overview: {
    concept: "Un consultant profesionist român, accesibil și de încredere — nu corporatist rigid, nu casual neglijent",
    impression: "Prima impresie: 'Această persoană știe ce vorbește și îmi vrea binele'",
    vibe: "Expert care te ajută, nu autoritate care te judecă",
  },

  /** Varianta B2B (profesional-consultanță) */
  b2b: {
    appearance: {
      age: "35-42 ani — suficient de experimentat pentru credibilitate",
      build: "Proporții normale, postură dreaptă dar relaxată — nu rigidă militar",
      face: "Trăsături plăcute, deschise. Privire directă, inteligentă, caldă. Ușor zâmbet natural — nu râs forțat, nu serios excesiv",
      skin: "Ton natural — piele sănătoasă, fără machiaj exagerat",
      hair: "Îngrijit, natural — nu extravagant, nu neglijat. Culoare naturală.",
    },
    clothing: {
      style: "Smart casual profesionist — între costum formal și casual",
      upper: "Cămașă (nu neapărat cu cravată) sau bluză elegantă. Culori: alb, albastru deschis, gri cald. Poate avea sacou dar neîncheiat.",
      colors: "Palette: indigo (#4F46E5) ca accent (brățară, ac cravată, eșarfă subtilă), fundal neutru (gri cald, bej)",
      avoid: "Nu costum complet cu cravată (prea rigid). Nu tricou (prea casual). Nu culori stridente.",
    },
    pose: {
      body: "Ușor înclinat spre interlocutor — arată interes, nu dominanță",
      hands: "Vizibile, gesticulare moderată — mâini deschise, nu încrucișate",
      expression: "Atenție activă — ascultă mai mult decât vorbește",
    },
    setting: {
      background: "Birou luminos, modern dar cald. Plante verzi. Cărți pe raft (fără titluri vizibile!). Lumină naturală.",
      objects: "Laptop deschis, caiet cu notițe (arată că pregătește pentru client). Ceașcă de cafea.",
      avoid: "Nu boardroom corporatist. Nu birou acasă dezordonat. Nu perete gol.",
    },
  },

  /** Varianta B2C (călăuză personală) */
  b2c: {
    appearance: {
      age: "30-38 ani — mai tânăr decât B2B, mai apropiat",
      build: "Aceleași proporții naturale, postura mai relaxată",
      face: "Aceeași persoană dar cu expresie mai caldă, mai deschisă. Zâmbet ușor mai pronunțat.",
    },
    clothing: {
      style: "Smart casual relaxat — pulover fin sau cămașă fără sacou",
      colors: "Tonuri calde: verde oliv, albastru petrol, crem. Accent indigo subtil.",
      avoid: "Nu formal. Nu sportiv. Nu hipster.",
    },
    setting: {
      background: "Spațiu luminos, confortabil — cafenea elegantă sau birou cu personalitate",
      objects: "Caiet deschis, stilou, plantă. Atmosferă de conversație, nu de consultație.",
    },
  },

  /** Prompt-uri pentru generare imagine AI */
  generationPrompts: {
    /** Prompt pentru avatar B2B (bust, fundal neutru) */
    b2b_avatar: `Professional Romanian consultant, age 35-42, warm intelligent eyes, slight natural smile, smart casual attire (light blue shirt, no tie, optional open blazer), indigo accent (pocket square or subtle), clean modern office background with warm lighting, natural plants, bookshelf (no visible titles), direct eye contact with camera, confident but approachable posture, photorealistic, high quality portrait, neutral warm color palette, European features`,

    /** Prompt pentru avatar B2C (bust, fundal cald) */
    b2c_avatar: `Approachable Romanian guide, age 30-38, same person as B2B but warmer expression, more relaxed clothing (fine knit sweater in olive green or soft blue), warm smile, bright comfortable setting like elegant cafe or creative office, notebook and pen on table, natural light, inviting atmosphere, photorealistic portrait, European features, direct warm eye contact`,

    /** Prompt pentru scenă completă B2B (consultanță) */
    b2b_scene: `Romanian business consultant in a modern warm office, sitting across from a client (not visible), leaning slightly forward showing interest, laptop open, notebook with handwritten notes, coffee cup, natural light from window, plants in background, professional but not corporate atmosphere, photorealistic, warm indigo color accents`,

    /** Prompt pentru scenă completă B2C (ghidaj) */
    b2c_scene: `Friendly Romanian mentor in a bright comfortable space, sitting in a relaxed pose with open posture, having a casual professional conversation, warm natural lighting, green plants, books, creative atmosphere, empathetic expression, photorealistic`,

    /** Negative prompt (ce NU vrem) */
    negative: `stock photo look, corporate stiff pose, fake smile, heavy makeup, extravagant clothing, dark moody lighting, cluttered background, visible brand logos, sunglasses, crossed arms, aggressive pose, too young (under 28), too old (over 50), American business style, power suit, red tie`,
  },

  /** Specificații tehnice per format */
  formats: {
    avatar_circle: { width: 200, height: 200, crop: "face center", border: "2px solid #4F46E5" },
    avatar_square: { width: 400, height: 400, crop: "head and shoulders" },
    chat_thumbnail: { width: 40, height: 40, crop: "face tight" },
    presentation_hero: { width: 1920, height: 1080, crop: "full scene" },
    email_signature: { width: 120, height: 120, crop: "face center" },
    landing_page: { width: 800, height: 600, crop: "bust with background" },
  },

  /** Reguli de consistență */
  consistency: {
    samePersonRule: "B2B și B2C sunt ACEEAȘI persoană — doar îmbrăcăminte și context diferite",
    noVariation: "Odată stabilit chipul, NU se schimbă. Clientul trebuie să recunoască ghidul oriunde.",
    brandAlignment: "Culorile din imagine respectă paleta JobGrade: indigo (#4F46E5), coral (#E85D43), gri cald",
    culturalFit: "Aspectul trebuie să fie credibil pe piața românească — nu american, nu nordic, nu asiatic",
  },
}
