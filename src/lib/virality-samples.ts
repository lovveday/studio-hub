import type { Brand, BrandFact } from "./types";
import type { Adaptation, Teardown } from "./virality-types";

export type SampleTeardown = {
  title: string;
  platform: string;
  creator: string;
  caption: string;
  transcript: string;
  durationSeconds: number;
  note: string;
  teardown: Teardown;
  adaptation: Adaptation;
  sourceText: string;
  draftText: string;
};

function draftText(adaptation: Adaptation): string {
  return [
    adaptation.hook,
    adaptation.caption,
    ...adaptation.script_outline.map((beat) => beat.line),
  ].join(" ");
}

function sourceText(teardown: Teardown): string {
  return teardown.transcript.map((line) => line.text).join(" ");
}

const LUMEN_SAMPLE: SampleContent = {
  title: "The 7-serum reset that calmed a reactive barrier",
  platform: "tiktok",
  creator: "Demo creator · @demo.skin",
  caption:
    "I stopped adding products and my skin finally calmed down. Not a cure, not a quick fix — just fewer steps. Save this for a bad skin night. #SkinMinimalism #BarrierCare",
  transcript:
    "Your barrier isn't broken. You're cleaning it too hard. I was using seven actives and wondering why my face stung every night. My formulator friend gave me one rule: if it stings, it's not working, it's damaging. I cut back to a gentle cleanser, one serum and a night cream for three weeks. The redness didn't vanish. It just stopped getting worse every time I tried something new. Save this for the next time your skin tells you to add another product.",
  durationSeconds: 41,
  note: "Illustrative sample built for this demo. The creator and clip are fictional; no performance numbers are claimed.",
  teardown: {
    title: "The 7-serum reset that calmed a reactive barrier",
    duration_seconds: 41,
    hook: {
      text: "Your barrier isn't broken. You're cleaning it too hard.",
      start: 0,
      end: 3,
      device: "Myth correction",
      why: "It removes blame from the viewer and contradicts the one thing they were told to do: add more.",
    },
    timeline: [
      {
        start: 0,
        end: 3,
        label: "Hook",
        beat: "hook",
        visual: "Tight crop on the creator's face, no intro, no logo.",
        on_screen_text: "YOUR BARRIER ISN'T BROKEN",
        audio: "Direct-to-camera speech.",
        purpose: "Reframe the problem before the viewer can scroll.",
      },
      {
        start: 3,
        end: 9,
        label: "The overdoing loop",
        beat: "tension",
        visual: "Handheld pan across a shelf of seven half-used bottles.",
        on_screen_text: "7 ACTIVES. STILL STINGING.",
        audio: "Speech plus soft room tone.",
        purpose: "Make the overdoing tangible and specific.",
      },
      {
        start: 9,
        end: 18,
        label: "The rule",
        beat: "method",
        visual: "Back to talking head; text card lands on the one rule.",
        on_screen_text: "IF IT STINGS, IT'S DAMAGE — NOT PROGRESS",
        audio: "One sentence, delivered slowly.",
        purpose: "Give the viewer a portable rule they can repeat.",
      },
      {
        start: 18,
        end: 29,
        label: "The reset",
        beat: "method",
        visual: "Three products on a bathroom ledge, one cut per product.",
        on_screen_text: "3 STEPS · 3 WEEKS",
        audio: "Speech, light music bed.",
        purpose: "Show the smallest possible version of the routine.",
      },
      {
        start: 29,
        end: 36,
        label: "What actually changed",
        beat: "proof",
        visual: "Close-up of skin texture in daylight; no before/after split.",
        on_screen_text: "LESS RED. LESS STINGING. NOT 'CURED'.",
        audio: "Quieter delivery; no triumphant music.",
        purpose: "Make an honest, modest proof claim instead of an outcome promise.",
      },
      {
        start: 36,
        end: 41,
        label: "Close and CTA",
        beat: "cta",
        visual: "Creator holds one product, looks back to camera.",
        on_screen_text: "SAVE THIS FOR A BAD SKIN NIGHT",
        audio: "Direct ask, no link.",
        purpose: "Convert the save without adding a sales step.",
      },
    ],
    transcript: [
      { start: 0, end: 3, text: "Your barrier isn't broken. You're cleaning it too hard." },
      { start: 3, end: 9, text: "I was using seven actives and wondering why my face stung every night." },
      {
        start: 9,
        end: 18,
        text: "My formulator friend gave me one rule: if it stings, it's not working, it's damaging.",
      },
      { start: 18, end: 29, text: "I cut back to a gentle cleanser, one serum and a night cream for three weeks." },
      {
        start: 29,
        end: 36,
        text: "The redness didn't vanish. It just stopped getting worse every time I tried something new.",
      },
      {
        start: 36,
        end: 41,
        text: "Save this for the next time your skin tells you to add another product.",
      },
    ],
    pacing: {
      cuts_per_minute: 24,
      average_shot_seconds: 2.5,
      notes: "Measured: 16 cuts in 41 seconds, including the text cards.",
    },
    cta: {
      text: "Save this for the next time your skin tells you to add another product.",
      type: "save",
      placement: "end",
    },
    keywords: ["barrier", "actives", "stinging", "cleanser", "serum", "routine", "redness"],
    hashtags: ["#SkinMinimalism", "#BarrierCare"],
    why_it_worked: [
      {
        claim: "The hook contradicts the viewer's assumption without blaming them.",
        evidence: "0:00 — “Your barrier isn't broken. You're cleaning it too hard.”",
        confidence: "high",
      },
      {
        claim: "A specific number makes the overdoing tangible.",
        evidence: "0:03 — “seven actives” and the shelf of seven bottles.",
        confidence: "high",
      },
      {
        claim: "The middle gives the viewer a portable rule, not just a story.",
        evidence: "0:09 — “If it stings, it's damage — not progress.”",
        confidence: "medium",
      },
      {
        claim: "The proof is honest: less bad, not cured. That keeps the comment section on side.",
        evidence: "0:29 — “The redness didn't vanish. It just stopped getting worse.”",
        confidence: "medium",
      },
    ],
    risks: [
      "The source flirts with a health claim (“barrier”, “damage”). The adaptation must stay on cosmetic wording and avoid treatment claims.",
      "No before/after imagery is used in the source; keep it that way.",
    ],
    confidence: "high",
    limitations:
      "One clip only. No retention, comment or sales data is available, so the hypotheses are about structure, not measured performance.",
  },
  adaptation: {
    angle:
      "Keep the myth-correction hook and the three-step reset, but make the routine the hero and the anti-overdoing rule the line people repeat.",
    hook: "Your skin isn't asking for another serum. It's asking for a break.",
    script_outline: [
      {
        start: 0,
        end: 3,
        beat: "Hook",
        line: "Your skin isn't asking for another serum. It's asking for a break.",
        shot: "Tight crop on the creator's face, no intro card.",
        on_screen_text: "YOUR SKIN ISN'T ASKING FOR ANOTHER SERUM",
      },
      {
        start: 3,
        end: 9,
        beat: "The overdoing loop",
        line: "If your routine stings, adding one more step will not fix it. It usually makes it worse.",
        shot: "Pan across a crowded bathroom shelf, then clear it to three products.",
        on_screen_text: "MORE STEPS ≠ BETTER SKIN",
      },
      {
        start: 9,
        end: 18,
        beat: "The rule",
        line: "The rule we use: if it stings, stop. Barrier first, actives later.",
        shot: "Talking head with the rule as a text card.",
        on_screen_text: "IF IT STINGS, STOP",
      },
      {
        start: 18,
        end: 29,
        beat: "The reset",
        line: "Three steps for two weeks: Gentle Cleanser, Barrier Repair Serum, Night Cream.",
        shot: "One cut per product on a bathroom ledge; hands only.",
        on_screen_text: "3 STEPS · 2 WEEKS",
      },
      {
        start: 29,
        end: 36,
        beat: "What changed",
        line: "Less stinging. Less random redness. No new miracle claim.",
        shot: "Daylight skin texture, no before/after split.",
        on_screen_text: "LESS STINGING. LESS REDNESS.",
      },
      {
        start: 36,
        end: 41,
        beat: "Close and CTA",
        line: "Keep this for a night when your skin feels like too much.",
        shot: "Creator holds the serum, looks back to camera.",
        on_screen_text: "SAVE THIS FOR TONIGHT",
      },
    ],
    shot_list: [
      {
        shot: "Hook",
        framing: "Tight vertical talking head",
        action: "Deliver the first line before any product or logo appears.",
        seconds: 3,
      },
      {
        shot: "The shelf",
        framing: "Handheld medium",
        action: "Show the crowded shelf, then remove everything but three products in one cut.",
        seconds: 6,
      },
      {
        shot: "The rule",
        framing: "Medium, static",
        action: "Say the rule; let the text card land for a full beat.",
        seconds: 4,
      },
      {
        shot: "The routine",
        framing: "Overhead close-up",
        action: "Cleanse, serum, night cream — one cut per step, no sped-up montage.",
        seconds: 11,
      },
      {
        shot: "The proof",
        framing: "Natural-light close-up",
        action: "Show texture and calm; say what did not happen as well as what did.",
        seconds: 7,
      },
      {
        shot: "Close",
        framing: "Tight vertical",
        action: "Product in hand, save-this ask as the final frame.",
        seconds: 5,
      },
    ],
    cta: "Keep this for a night when your skin feels like too much.",
    caption:
      "Your skin isn't asking for another serum. It's asking for a break.\n\nBarrier Repair Serum is ₦25,000 for 30ml.\n\nKeep this for a night when your skin feels like too much.\n\n#LumenSkin #BarrierCare #SkinMinimalism",
    hashtags: "#LumenSkin #BarrierCare #SkinMinimalism",
    test_plan: {
      variant_a: {
        name: "Hook-first",
        change: "Open on the face and the myth-correction line, as scripted.",
        hypothesis: "The contradiction lifts the 3-second hold among people already using too many actives.",
      },
      variant_b: {
        name: "Shelf-first",
        change: "Open on the crowded shelf for one second, then land the hook as a voiceover.",
        hypothesis: "Seeing the overdoing before hearing it makes the problem concrete for low-awareness viewers.",
      },
      metric: "3-second hold rate and saves per reach",
      window: "7 days, same posting slot",
    },
    facts_used: ["₦25,000 for the 30ml Barrier Repair Serum"],
    guardrails: [
      "Do not use: cures eczema, dermatologist-approved, 100% natural, permanent results.",
      "No before/after imagery and no treatment claims. Keep it cosmetic.",
      "Do not reuse the source creator's footage, voice or phrasing.",
    ],
  },
};

const COPPER_SAMPLE: SampleContent = {
  title: "One earring, three wedding looks",
  platform: "instagram",
  creator: "Demo creator · @demo.style",
  caption:
    "You don't need a new outfit for every wedding. You need one earring that changes the room. The Ada Hoop, three ways. Save this for your next invitation. #CopperAndCo #WeddingGuestEdit",
  transcript:
    "The earring rule every wedding guest gets wrong. You don't need a new outfit. You need one earring that changes the room. Start with the Ada Hoop. Same earring, three looks: ceremony, reception, after-party. The trick is the hair and the neckline, not more jewellery. Save this for the next wedding on your calendar.",
  durationSeconds: 28,
  note: "Illustrative sample built for this demo. The creator and clip are fictional; no performance numbers are claimed.",
  teardown: {
    title: "One earring, three wedding looks",
    duration_seconds: 28,
    hook: {
      text: "The earring rule every wedding guest gets wrong.",
      start: 0,
      end: 2.5,
      device: "Myth correction",
      why: "It promises a rule and implies the viewer is currently breaking it — a low-cost reason to keep watching.",
    },
    timeline: [
      {
        start: 0,
        end: 2.5,
        label: "Hook",
        beat: "hook",
        visual: "Mirror selfie, earring already on, no intro.",
        on_screen_text: "THE WEDDING GUEST EARRING RULE",
        audio: "Voiceover starts immediately.",
        purpose: "Set a rule the viewer needs to hear before the reveal.",
      },
      {
        start: 2.5,
        end: 8,
        label: "The reframe",
        beat: "tension",
        visual: "Quick cuts of three outfits with the same hoop.",
        on_screen_text: "NEW OUTFIT? NOT THE POINT.",
        audio: "Voiceover plus a clean beat.",
        purpose: "Shift the purchase from outfit to accessory.",
      },
      {
        start: 8,
        end: 16,
        label: "Three looks",
        beat: "method",
        visual: "Split-screen triptych: ceremony, reception, after-party.",
        on_screen_text: "CEREMONY · RECEPTION · AFTER-PARTY",
        audio: "Beat drops on each look; no narration for one beat.",
        purpose: "Show range without adding talking points.",
      },
      {
        start: 16,
        end: 24,
        label: "The real trick",
        beat: "method",
        visual: "Close-ups of hair up/down and neckline changes.",
        on_screen_text: "HAIR + NECKLINE > MORE JEWELLERY",
        audio: "Voiceover returns.",
        purpose: "Give a styling rule that makes the earring feel versatile.",
      },
      {
        start: 24,
        end: 28,
        label: "Close and CTA",
        beat: "cta",
        visual: "Hero shot of the hoop on a clean background.",
        on_screen_text: "SAVE FOR THE NEXT WEDDING",
        audio: "Final line, music resolves.",
        purpose: "Ask for the save while the product is on screen.",
      },
    ],
    transcript: [
      { start: 0, end: 2.5, text: "The earring rule every wedding guest gets wrong." },
      {
        start: 2.5,
        end: 8,
        text: "You don't need a new outfit. You need one earring that changes the room.",
      },
      {
        start: 8,
        end: 16,
        text: "Start with the Ada Hoop. Same earring, three looks: ceremony, reception, after-party.",
      },
      { start: 16, end: 24, text: "The trick is the hair and the neckline, not more jewellery." },
      { start: 24, end: 28, text: "Save this for the next wedding on your calendar." },
    ],
    pacing: {
      cuts_per_minute: 30,
      average_shot_seconds: 2,
      notes: "Measured: 14 cuts in 28 seconds; the triptych section holds longer.",
    },
    cta: {
      text: "Save this for the next wedding on your calendar.",
      type: "save",
      placement: "end",
    },
    keywords: ["earring", "wedding", "outfit", "hoop", "hair", "neckline", "guest"],
    hashtags: ["#CopperAndCo", "#WeddingGuestEdit"],
    why_it_worked: [
      {
        claim: "The hook promises a rule, not a product.",
        evidence: "0:00 — “The earring rule every wedding guest gets wrong.”",
        confidence: "high",
      },
      {
        claim: "Three looks answer the real objection: will I wear it more than once?",
        evidence: "0:08 — the ceremony / reception / after-party triptych.",
        confidence: "high",
      },
      {
        claim: "A styling rule makes the product feel like a system, not a single purchase.",
        evidence: "0:16 — “The trick is the hair and the neckline, not more jewellery.”",
        confidence: "medium",
      },
    ],
    risks: [
      "The source implies the earring is the only change needed. Keep styling claims about the look, not about metal quality.",
      "Do not repeat the source's product name; use the brand's own SKU and approved materials.",
    ],
    confidence: "high",
    limitations:
      "One clip only. No retention or sales data; the hypotheses are structural.",
  },
  adaptation: {
    angle:
      "Keep the rule-then-triptych structure, but replace the single-product styling trick with the brand's own 'one hoop, three ceremonies' edit.",
    hook: "Your outfit isn't the problem. Your earrings are doing nothing.",
    script_outline: [
      {
        start: 0,
        end: 2.5,
        beat: "Hook",
        line: "Your outfit isn't the problem. Your earrings are doing nothing.",
        shot: "Mirror selfie in a wedding-guest look, hoop already on.",
        on_screen_text: "YOUR OUTFIT ISN'T THE PROBLEM",
      },
      {
        start: 2.5,
        end: 8,
        beat: "The reframe",
        line: "You don't need another dress. You need one pair that does the work.",
        shot: "Three outfit cuts, same hoop.",
        on_screen_text: "ONE PAIR. THREE ROOMS.",
      },
      {
        start: 8,
        end: 16,
        beat: "Three looks",
        line: "The Ada Hoop, three ways: ceremony, reception, after-party.",
        shot: "Triptych of the three looks; hold one beat on each.",
        on_screen_text: "CEREMONY · RECEPTION · AFTER-PARTY",
      },
      {
        start: 16,
        end: 24,
        beat: "The real trick",
        line: "Change the hair, change the neckline. The earring stays.",
        shot: "Close-ups of hair up/down and neckline changes.",
        on_screen_text: "HAIR + NECKLINE > MORE JEWELLERY",
      },
      {
        start: 24,
        end: 28,
        beat: "Close and CTA",
        line: "Keep this for a wedding invitation on your calendar.",
        shot: "Hero shot of the Ada Hoop on a clean background.",
        on_screen_text: "SAVE FOR THE NEXT WEDDING",
      },
    ],
    shot_list: [
      {
        shot: "Hook",
        framing: "Mirror selfie, vertical",
        action: "Start on the finished look; no unboxing, no logo.",
        seconds: 3,
      },
      {
        shot: "The three rooms",
        framing: "Triptych, matched crop",
        action: "Same hoop, three outfits; change only the styling around it.",
        seconds: 8,
      },
      {
        shot: "The trick",
        framing: "Close-up sequence",
        action: "Show hair up, hair down, high neckline, bare shoulder.",
        seconds: 8,
      },
      {
        shot: "The hero",
        framing: "Clean product still",
        action: "Hold on the Ada Hoop while the save ask lands.",
        seconds: 4,
      },
    ],
    cta: "Keep this for a wedding invitation on your calendar.",
    caption:
      "Your outfit isn't the problem. Your earrings are doing nothing.\n\nThe Ada Hoop is ₦18,500 and styled three ways here.\n\nKeep this for a wedding invitation on your calendar.\n\n#CopperAndCo #WeddingGuestEdit #NaijaCraft",
    hashtags: "#CopperAndCo #WeddingGuestEdit #NaijaCraft",
    test_plan: {
      variant_a: {
        name: "Rule-first",
        change: "Open on the face with the rewritten hook, then the triptych.",
        hypothesis: "The contrarian line earns the 3 seconds needed to reach the looks.",
      },
      variant_b: {
        name: "Look-first",
        change: "Open on the three-look triptych for two seconds, then land the hook.",
        hypothesis: "The visual range sells the versatility before the claim is made.",
      },
      metric: "3-second hold rate and saves per reach",
      window: "7 days, same posting slot",
    },
    facts_used: ["₦18,500 for the Ada Hoop"],
    guardrails: [
      "Do not use: solid gold, hypoallergenic, lifetime guarantee.",
      "Do not claim metal quality or allergy safety unless the SKU is verified.",
      "Do not reuse the source creator's footage, voice or phrasing.",
    ],
  },
};

const NORTHSTAR_SAMPLE: SampleContent = {
  title: "The smallest first step",
  platform: "tiktok",
  creator: "Demo creator · @demo.coach",
  caption:
    "You don't need more motivation. You need a smaller first step. One set. One cue. One day. Save this and start today. #NorthstarFit #StrengthForLife",
  transcript:
    "You don't need more motivation. You need a smaller first step. Most people quit because the plan starts at an hour, not ten minutes. Here's the reset: one set, one cue, one day. That's it. Do that for a week. Then add the second set. The habit comes before the programme. Save this and start with one set today.",
  durationSeconds: 33,
  note: "Illustrative sample built for this demo. The creator and clip are fictional; no performance numbers are claimed.",
  teardown: {
    title: "The smallest first step",
    duration_seconds: 33,
    hook: {
      text: "You don't need more motivation. You need a smaller first step.",
      start: 0,
      end: 3,
      device: "Pattern interrupt",
      why: "It rejects the standard advice ('get motivated') and offers a smaller, more believable action.",
    },
    timeline: [
      {
        start: 0,
        end: 3,
        label: "Hook",
        beat: "hook",
        visual: "Coach sits on a gym floor, no music intro.",
        on_screen_text: "NOT MORE MOTIVATION",
        audio: "Direct speech, quiet room.",
        purpose: "Replace the viewer's explanation for why they quit.",
      },
      {
        start: 3,
        end: 10,
        label: "The reason people quit",
        beat: "tension",
        visual: "A phone notes app with a very long workout plan.",
        on_screen_text: "THE PLAN STARTS AT 60 MIN",
        audio: "Speech, no music yet.",
        purpose: "Name the real barrier: the size of the first step.",
      },
      {
        start: 10,
        end: 20,
        label: "The reset",
        beat: "method",
        visual: "Coach demonstrates one set of a goblet squat.",
        on_screen_text: "1 SET · 1 CUE · 1 DAY",
        audio: "Speech plus the sound of the set.",
        purpose: "Make the first step visible and almost too small to refuse.",
      },
      {
        start: 20,
        end: 29,
        label: "The progression",
        beat: "method",
        visual: "Text card adding one set per week; no before/after.",
        on_screen_text: "WEEK 1: 1 SET. WEEK 2: 2 SETS.",
        audio: "Speech, low music bed.",
        purpose: "Show that the habit comes before the programme.",
      },
      {
        start: 29,
        end: 33,
        label: "Close and CTA",
        beat: "cta",
        visual: "Coach looks back to camera, kettlebell in frame.",
        on_screen_text: "START WITH ONE SET TODAY",
        audio: "Direct ask.",
        purpose: "Turn the idea into an action the viewer can take now.",
      },
    ],
    transcript: [
      {
        start: 0,
        end: 3,
        text: "You don't need more motivation. You need a smaller first step.",
      },
      {
        start: 3,
        end: 10,
        text: "Most people quit because the plan starts at an hour, not ten minutes.",
      },
      {
        start: 10,
        end: 20,
        text: "Here's the reset: one set, one cue, one day. That's it.",
      },
      {
        start: 20,
        end: 29,
        text: "Do that for a week. Then add the second set. The habit comes before the programme.",
      },
      { start: 29, end: 33, text: "Save this and start with one set today." },
    ],
    pacing: {
      cuts_per_minute: 20,
      average_shot_seconds: 3,
      notes: "Measured: 11 cuts in 33 seconds; the demonstration holds longer.",
    },
    cta: {
      text: "Save this and start with one set today.",
      type: "save",
      placement: "end",
    },
    keywords: ["motivation", "habit", "set", "plan", "programme", "start", "gym"],
    hashtags: ["#NorthstarFit", "#StrengthForLife"],
    why_it_worked: [
      {
        claim: "The hook rejects the usual advice, which makes it feel new.",
        evidence: "0:00 — “You don't need more motivation.”",
        confidence: "high",
      },
      {
        claim: "The barrier is made concrete with a comparison.",
        evidence: "0:03 — “the plan starts at an hour, not ten minutes.”",
        confidence: "high",
      },
      {
        claim: "The smallest step is demonstrated, not just described.",
        evidence: "0:10 — one set of a goblet squat, one cue, one day.",
        confidence: "medium",
      },
      {
        claim: "No weight-loss or transformation promise is made.",
        evidence: "0:20 — the only progression is sets per week.",
        confidence: "high",
      },
    ],
    risks: [
      "The source gives general training advice. The adaptation must not imply it fixes pain or injury.",
      "Do not add before/after imagery or weight-loss outcomes.",
    ],
    confidence: "high",
    limitations:
      "One clip only. No retention or member data; the hypotheses are about structure.",
  },
  adaptation: {
    angle:
      "Keep the anti-motivation hook and the one-set demonstration, but replace the generic plan with the brand's own first week of Strength Base.",
    hook: "Your plan isn't too hard. Your first step is too big.",
    script_outline: [
      {
        start: 0,
        end: 3,
        beat: "Hook",
        line: "Your plan isn't too hard. Your first step is too big.",
        shot: "Coach on the gym floor, direct to camera.",
        on_screen_text: "YOUR FIRST STEP IS TOO BIG",
      },
      {
        start: 3,
        end: 10,
        beat: "The reason people quit",
        line: "If week one starts with five sessions, week two starts with guilt.",
        shot: "Phone notes app with a five-session plan, then one line crossed out.",
        on_screen_text: "5 SESSIONS → 0 SESSIONS",
      },
      {
        start: 10,
        end: 20,
        beat: "The reset",
        line: "Start with a single goblet-squat set, one coaching cue, one session.",
        shot: "Demonstrate the set; hold on the cue.",
        on_screen_text: "1 SET · 1 CUE · 1 SESSION",
      },
      {
        start: 20,
        end: 29,
        beat: "The progression",
        line: "Week two adds one more set. The habit has to exist before the programme.",
        shot: "Text card with the weekly progression; no before/after.",
        on_screen_text: "WEEK 1: 1 SET · WEEK 2: 2 SETS",
      },
      {
        start: 29,
        end: 33,
        beat: "Close and CTA",
        line: "Keep this and begin with a single set.",
        shot: "Coach looks back to camera, kettlebell in frame.",
        on_screen_text: "START WITH ONE SET TODAY",
      },
    ],
    shot_list: [
      {
        shot: "Hook",
        framing: "Medium, seated on the floor",
        action: "Deliver the line before standing up or touching a weight.",
        seconds: 3,
      },
      {
        shot: "The plan",
        framing: "Over-the-shoulder phone screen",
        action: "Show the five-session week, then delete four lines in one cut.",
        seconds: 5,
      },
      {
        shot: "The set",
        framing: "Medium-wide, side angle",
        action: "One clean goblet squat set; name the one cue out loud.",
        seconds: 10,
      },
      {
        shot: "The progression",
        framing: "Text card",
        action: "One set, then two sets; no body transformation frames.",
        seconds: 6,
      },
      {
        shot: "Close",
        framing: "Medium, direct to camera",
        action: "Save ask, kettlebell visible but not lifted.",
        seconds: 4,
      },
    ],
    cta: "Keep this and begin with a single set.",
    caption:
      "Your plan isn't too hard. Your first step is too big.\n\nStrength Base opens with a single set, one coaching cue, one session. The 12-week programme is ₦85,000 when you're ready for the full block.\n\nKeep this and begin with a single set.\n\n#NorthstarFit #StrengthForLife #TrainSmart",
    hashtags: "#NorthstarFit #StrengthForLife #TrainSmart",
    test_plan: {
      variant_a: {
        name: "Coach-first",
        change: "Open on the coach delivering the anti-motivation line.",
        hypothesis: "Direct address earns the 3 seconds needed to reach the demonstration.",
      },
      variant_b: {
        name: "Set-first",
        change: "Open on the single goblet squat set, then land the line as voiceover.",
        hypothesis: "The demonstration makes the promise credible before the claim.",
      },
      metric: "3-second hold rate and saves per reach",
      window: "7 days, same posting slot",
    },
    facts_used: ["₦85,000 for the 12-week Strength Base programme"],
    guardrails: [
      "Do not use: guaranteed 10kg loss, fixes back pain, no injury risk.",
      "No body-shaming, weight-loss promises or before/after images.",
      "Do not reuse the source creator's footage, voice or phrasing.",
    ],
  },
};

const SAMPLES: Record<string, SampleContent> = {
  "brand-lumen": LUMEN_SAMPLE,
  "brand-copper": COPPER_SAMPLE,
  "brand-northstar": NORTHSTAR_SAMPLE,
};

type SampleContent = Omit<SampleTeardown, "sourceText" | "draftText">;

export function sampleForBrand(brand: Brand, facts: BrandFact[] = []): SampleTeardown | null {
  const sample = SAMPLES[brand.id];
  if (!sample) return null;
  const copy = structuredClone(sample);
  const approved = facts.filter((fact) => fact.status === "approved" && !fact.valid_to);
  const priceFact = approved.find((fact) => /price|retail/i.test(fact.subject));
  const oldPrice = copy.adaptation.caption.match(/₦[\d,]+/)?.[0];
  const newPrice = priceFact?.value.match(/₦[\d,]+/)?.[0];

  if (oldPrice) {
    if (newPrice && priceFact) {
      if (newPrice !== oldPrice) {
        copy.adaptation.caption = copy.adaptation.caption.replaceAll(oldPrice, newPrice);
        copy.adaptation.facts_used = copy.adaptation.facts_used.map((fact) =>
          fact.includes(oldPrice) ? priceFact.value : fact
        );
      }
    } else {
      copy.adaptation.caption = copy.adaptation.caption
        .split("\n")
        .filter((line) => !line.includes(oldPrice))
        .join("\n");
      copy.adaptation.facts_used = copy.adaptation.facts_used.filter(
        (fact) => !fact.includes(oldPrice)
      );
    }
  }

  return {
    ...copy,
    sourceText: sourceText(copy.teardown),
    draftText: draftText(copy.adaptation),
  };
}

export function canLoadSample(brandId: string): boolean {
  return Boolean(SAMPLES[brandId]);
}
