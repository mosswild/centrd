/**
 * Utilities for normalizing, formatting, colorizing, and cross-linking pottery throw notes and photos.
 */

export const POTTERY_STAGES = [
  'Wet Clay',
  'Trimmed',
  'Glaze Application',
  'Fired'
];

export const POST_IT_PALETTE = [
  { bg: '#fff59d', border: '#fbc02d', text: '#3e2723', tagBg: '#fbc02d', name: 'Yellow' },      // Honey Yellow
  { bg: '#fcdcd1', border: '#e57373', text: '#4a148c', tagBg: '#c96f53', name: 'Terracotta' },  // Terracotta Rose
  { bg: '#d2f0df', border: '#81c784', text: '#1b5e20', tagBg: '#5d8e75', name: 'Celadon' },     // Celadon Mint
  { bg: '#fae3c3', border: '#ffb74d', text: '#4e2600', tagBg: '#d0944b', name: 'Ochre' },       // Studio Ochre
  { bg: '#d4ebf8', border: '#64b5f6', text: '#0d47a1', tagBg: '#4e5d6c', name: 'Slate' },       // Slate Blue
  { bg: '#f3e5f5', border: '#ba68c8', text: '#4a148c', tagBg: '#ab47bc', name: 'Lavender' }     // Clay Lavender
];

/**
 * Normalizes stage strings for matching photos and notes
 */
export function isSameStage(stageA, stageB) {
  if (!stageA || !stageB) return false;
  const sA = stageA.toLowerCase().trim();
  const sB = stageB.toLowerCase().trim();
  if (sA === sB) return true;
  if (sA.includes('glazed') && sB.includes('glazed')) return true;
  if (sA.includes('finished') && sB.includes('finished')) return true;
  return false;
}

/**
 * Returns photos matching a specific pottery stage
 */
export function getMatchingStagePhotos(photos, stage) {
  if (!Array.isArray(photos) || !stage) return [];
  return photos.filter(p => isSameStage(p.stage, stage));
}

/**
 * Dynamically aggregates configured, standard, and custom stages present across photos and notes
 */
export function getAvailableStages(throwItem, allThrows = [], settings = null) {
  const base = (settings && Array.isArray(settings.potteryStages) && settings.potteryStages.length > 0)
    ? [...settings.potteryStages]
    : [...POTTERY_STAGES];

  const itemsToCheck = throwItem ? [throwItem] : (allThrows || []);
  
  itemsToCheck.forEach(item => {
    if (!item) return;

    // Collect custom stages from photos
    if (Array.isArray(item.photos)) {
      item.photos.forEach(p => {
        if (p.stage && !base.some(s => isSameStage(s, p.stage))) {
          base.push(p.stage);
        }
      });
    }

    // Collect custom stages from notes
    const notesArr = getNotesArray(item);
    notesArr.forEach(n => {
      if (n.stage && !base.some(s => isSameStage(s, n.stage))) {
        base.push(n.stage);
      }
    });
  });

  return base;
}

/**
 * Gets a consistent post-it color based on note index or stage
 */
export function getPostItColor(index, stage) {
  if (isSameStage(stage, 'Wet Clay')) return POST_IT_PALETTE[0];
  if (isSameStage(stage, 'Trimmed') || isSameStage(stage, 'Leather Hard')) return POST_IT_PALETTE[3];
  if (isSameStage(stage, 'Glaze Application') || isSameStage(stage, 'Glazed')) return POST_IT_PALETTE[5];
  if (isSameStage(stage, 'Fired') || isSameStage(stage, 'Finished')) return POST_IT_PALETTE[2];
  
  return POST_IT_PALETTE[index % POST_IT_PALETTE.length];
}

/**
 * Normalizes throw notes into an array of note objects.
 * Handles backward compatibility for entries created with legacy string `notes`.
 */
export function getNotesArray(throwItem) {
  if (!throwItem) return [];

  if (Array.isArray(throwItem.notesArray) && throwItem.notesArray.length > 0) {
    return throwItem.notesArray;
  }

  // Fallback if legacy `notes` string is present
  if (typeof throwItem.notes === 'string' && throwItem.notes.trim().length > 0) {
    return [
      {
        id: `legacy_${throwItem.id || Date.now()}`,
        text: throwItem.notes.trim(),
        stage: 'Wet Clay',
        createdAt: throwItem.createdAt || new Date().toISOString(),
        updatedAt: throwItem.createdAt || new Date().toISOString()
      }
    ];
  }

  return [];
}

/**
 * Formats an array of notes into a single formatted summary string.
 * Used for legacy string fields and Markdown export summaries.
 */
export function formatNotesSummary(notesArray) {
  if (!Array.isArray(notesArray) || notesArray.length === 0) return '';
  return notesArray
    .map(n => `[${n.stage || 'General'}] ${n.text}`)
    .join('\n');
}
