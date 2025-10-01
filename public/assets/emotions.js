/* public/assets/emotions.js
   Hi Emotions catalog (client-side)
   - Exposes window.HI_EMOTIONS for simple <script src="..."> usage
   - Dispatches "hi:emotions-ready" if any code wants to react to load
*/
(function () {
  const CATALOG = {
    categories: [
      {
        id: "hi",
        label: "Hi Energy",
        items: [
          { emoji: "😊", name: "Joy", desc: "Flowing with life, aligned and present." },
          { emoji: "🙏", name: "Appreciation", desc: "Seeing the best in what is." },
          { emoji: "💪", name: "Empowerment", desc: "Tuned in, tapped in, turned on." },
          { emoji: "🕊️", name: "Freedom", desc: "Allowing. No resistance, no limits." },
          { emoji: "❤️", name: "Love", desc: "Vibrationally connected to self + others." },
          { emoji: "🔥", name: "Passion", desc: "Energized by purpose and direction." },
          { emoji: "🎉", name: "Enthusiasm", desc: "Alive about what's coming." },
          { emoji: "🚀", name: "Eagerness", desc: "Leaning forward into what's next." },
          { emoji: "😌", name: "Happiness", desc: "Emotionally stable, uplifted." },
          { emoji: "✨", name: "Belief", desc: "Trust: it's on its way." },
          { emoji: "☀️", name: "Optimism", desc: "The path is lighting up." },
          { emoji: "🎈", name: "Hopefulness", desc: "Space is open for more." },
          { emoji: "🌿", name: "Calm", desc: "Soft body, clear mind." },
          { emoji: "🌟", name: "Inspired", desc: "Ideas arrive with ease." },
          { emoji: "🤝", name: "Connected", desc: "Belonging, supported." },
          { emoji: "🙌", name: "Gratitude", desc: "Thankful and receiving." },
          { emoji: "🏅", name: "Proud", desc: "Owning your progress." },
          { emoji: "🌈", name: "Relief", desc: "Tension released." }
        ]
      },
      {
        id: "neutral",
        label: "Neutral",
        items: [
          { emoji: "😐", name: "Boredom", desc: "Stable, ready to feel more." },
          { emoji: "😕", name: "Pessimism", desc: "Awareness is the first step." },
          { emoji: "😤", name: "Frustration", desc: "Sensing what you want, stuck in contrast." },
          { emoji: "😫", name: "Overwhelm", desc: "Too much at once." },
          { emoji: "😔", name: "Disappointment", desc: "It went differently; that’s okay." },
          { emoji: "🤔", name: "Doubt", desc: "Questioning what's possible." },
          { emoji: "😟", name: "Worry", desc: "Projecting uncertainty." },
          { emoji: "👆", name: "Blame", desc: "Handing power away." },
          { emoji: "😞", name: "Discouragement", desc: "Feeling the gap." },
          { emoji: "🧩", name: "Uncertain", desc: "Pieces not clicking yet." },
          { emoji: "😶", name: "Apathy", desc: "Low energy, indifferent." }
        ]
      },
      {
        id: "opportunity",
        label: "Hi Opportunity",
        items: [
          { emoji: "😠", name: "Anger", desc: "Boundaries crossed; you matter." },
          { emoji: "⚖️", name: "Revenge", desc: "Seeking balance; alignment feels better." },
          { emoji: "😡", name: "Rage", desc: "Intense resistance; clarity is growing." },
          { emoji: "😒", name: "Jealousy", desc: "Wanting more for yourself." },
          { emoji: "😰", name: "Insecurity", desc: "Forgetting your worth." },
          { emoji: "😔", name: "Guilt", desc: "Misaligned with your value." },
          { emoji: "😨", name: "Fear", desc: "Imagining disconnection." },
          { emoji: "😢", name: "Grief", desc: "Honoring what mattered." },
          { emoji: "😞", name: "Powerlessness", desc: "Far from alignment; small shifts count." },
          { emoji: "🧨", name: "Resentment", desc: "Old charge still active." },
          { emoji: "🥀", name: "Hopeless", desc: "Hard to see a path yet." }
        ]
      }
    ]
  };

  // Attach safely to window (don’t clobber if something pre-exists)
  try {
    if (!window.HI_EMOTIONS || !Array.isArray(window.HI_EMOTIONS.categories)) {
      window.HI_EMOTIONS = CATALOG;
    } else {
      window.HI_EMOTIONS = CATALOG; // authoritative source
    }
  } catch { window.HI_EMOTIONS = CATALOG; }

  // Optional: let listeners know the catalog is ready
  try { document.dispatchEvent(new CustomEvent("hi:emotions-ready")); } catch {}
})();
