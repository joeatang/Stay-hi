// HiStreakMilestones.js
// Centralized milestone thresholds and helpers for streak-related UIs.
// Load early (classic script). Provides window.HiStreakMilestones.
(function(){
  if (window.HiStreakMilestones) return;
  const MILESTONES = [
    { threshold: 3,   name: 'Hi Habit',      emoji: '🔥', rarity: 'common' },
    { threshold: 7,   name: 'Week Keeper',   emoji: '💪', rarity: 'common' },
    { threshold: 15,  name: 'Momentum Build',emoji: '⚡', rarity: 'uncommon' },
    { threshold: 30,  name: 'Monthly Hi',    emoji: '🌙', rarity: 'rare' },
    { threshold: 50,  name: 'Hi Champion',   emoji: '🏆', rarity: 'rare' },
    { threshold: 100, name: 'Steady Light',  emoji: '🔥', rarity: 'legendary' }
  ];
  function getCurrent(streak){ let cur=null; for(const m of MILESTONES){ if(streak>=m.threshold) cur=m; } return cur; }
  function getNext(streak){ for(const m of MILESTONES){ if(streak < m.threshold) return m; } return null; }
  function describeProgress(streak){ const current=getCurrent(streak); const next=getNext(streak); return { current, next, remaining: next? (next.threshold - streak):0 }; }
  window.HiStreakMilestones = { list: ()=>[...MILESTONES], getCurrent, getNext, describeProgress };
})();
