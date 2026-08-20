export function getThrowChallenges(t) {
  if (!t) return [];
  if (Array.isArray(t.challengeNames) && t.challengeNames.length > 0) {
    return t.challengeNames.filter(Boolean);
  }
  if (t.challengeName) return [t.challengeName];
  return [];
}

export function isThrowInChallenge(t, challengeName) {
  if (!t || !challengeName) return true;
  const tags = getThrowChallenges(t);
  if (tags.length === 0) return true;
  const targetNameLower = challengeName.toLowerCase().trim();
  return tags.some(tag => tag && tag.toLowerCase().trim() === targetNameLower);
}

export function getSavedChallenges(settings) {
  if (Array.isArray(settings?.savedChallenges) && settings.savedChallenges.length > 0) {
    return settings.savedChallenges;
  }
  const defaultName = settings?.challengeName || '200 Piece Challenge';
  return [
    {
      id: 'default_chal',
      name: defaultName,
      targetCylinders: settings?.targetCylinders || 200,
      hasTimeLimit: settings?.hasTimeLimit || false,
      scheduleType: settings?.scheduleType || 'none',
      startDate: settings?.startDate || new Date().toISOString().split('T')[0],
      endDate: settings?.endDate || '',
      cadenceFrequency: settings?.cadenceFrequency || 3,
      cadencePeriod: settings?.cadencePeriod || 'week',
      challengeStartDate: settings?.challengeStartDate || '',
      weightCategories: settings?.weightCategories || [
        { id: "1lb", name: "1 lb Piece", weight: 1, unit: settings?.globalUnit || "lb", targetCount: 100 },
        { id: "2lb", name: "2 lb Piece", weight: 2, unit: settings?.globalUnit || "lb", targetCount: 50 },
        { id: "3lb", name: "3 lb Piece", weight: 3, unit: settings?.globalUnit || "lb", targetCount: 30 },
        { id: "5lb", name: "5 lb Piece", weight: 5, unit: settings?.globalUnit || "lb", targetCount: 20 }
      ]
    }
  ];
}

export function calculateTotalTarget(weightCategories = []) {
  if (!Array.isArray(weightCategories)) return 0;
  return weightCategories.reduce((sum, cat) => sum + (Number(cat.targetCount) || 0), 0);
}

export function switchActiveChallengeInSettings(settings, targetChallengeName) {
  const currentChallenges = getSavedChallenges(settings);
  const currentActiveName = settings?.challengeName || '200 Piece Challenge';

  const currentCats = settings.weightCategories || [];
  const currentTotal = calculateTotalTarget(currentCats);

  // 1. Snapshot current active challenge settings into savedChallenges array
  const currentSnapshot = {
    id: currentActiveName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
    name: currentActiveName,
    targetCylinders: currentTotal > 0 ? currentTotal : (settings.targetCylinders || 200),
    hasTimeLimit: settings.hasTimeLimit || false,
    scheduleType: settings.scheduleType || 'none',
    startDate: settings.startDate || new Date().toISOString().split('T')[0],
    endDate: settings.endDate || '',
    cadenceFrequency: settings.cadenceFrequency || 3,
    cadencePeriod: settings.cadencePeriod || 'week',
    weightCategories: currentCats
  };

  let updatedSavedChallenges = [...currentChallenges];
  const existingIdx = updatedSavedChallenges.findIndex(c => c.name.toLowerCase().trim() === currentActiveName.toLowerCase().trim());
  if (existingIdx >= 0) {
    updatedSavedChallenges[existingIdx] = { ...updatedSavedChallenges[existingIdx], ...currentSnapshot };
  } else {
    updatedSavedChallenges.push(currentSnapshot);
  }

  // 2. Find target challenge or create initial template
  let targetConfig = updatedSavedChallenges.find(c => c.name.toLowerCase().trim() === targetChallengeName.toLowerCase().trim());
  
  if (!targetConfig) {
    const defaultCats = (settings.weightCategories || []).map(cat => ({ ...cat }));
    const defaultTotal = calculateTotalTarget(defaultCats);
    targetConfig = {
      id: targetChallengeName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      name: targetChallengeName,
      targetCylinders: defaultTotal > 0 ? defaultTotal : 200,
      hasTimeLimit: false,
      scheduleType: 'none',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      cadenceFrequency: 3,
      cadencePeriod: 'week',
      weightCategories: defaultCats
    };
    updatedSavedChallenges.push(targetConfig);
  }

  const targetCats = targetConfig.weightCategories && targetConfig.weightCategories.length > 0 ? targetConfig.weightCategories : settings.weightCategories;
  const computedTotal = calculateTotalTarget(targetCats);

  // 3. Return updated merged settings object
  return {
    ...settings,
    savedChallenges: updatedSavedChallenges,
    challengeName: targetConfig.name,
    targetCylinders: computedTotal > 0 ? computedTotal : (targetConfig.targetCylinders || 200),
    hasTimeLimit: targetConfig.hasTimeLimit,
    scheduleType: targetConfig.scheduleType,
    startDate: targetConfig.startDate,
    endDate: targetConfig.endDate,
    cadenceFrequency: targetConfig.cadenceFrequency,
    cadencePeriod: targetConfig.cadencePeriod,
    weightCategories: targetCats
  };
}

export function deleteChallengeFromSettings(settings, challengeNameToDelete) {
  const currentChallenges = getSavedChallenges(settings);
  const remaining = currentChallenges.filter(
    c => c.name.toLowerCase().trim() !== challengeNameToDelete.toLowerCase().trim()
  );

  const safeRemaining = remaining.length > 0 ? remaining : [
    {
      id: 'default_chal',
      name: '200 Piece Challenge',
      targetCylinders: 200,
      hasTimeLimit: false,
      scheduleType: 'none',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      cadenceFrequency: 3,
      cadencePeriod: 'week',
      weightCategories: settings.weightCategories || []
    }
  ];

  // Target remaining challenge
  let targetConfig = safeRemaining[0];

  const targetCats = targetConfig.weightCategories && targetConfig.weightCategories.length > 0
    ? targetConfig.weightCategories
    : settings.weightCategories;
  const computedTotal = calculateTotalTarget(targetCats);

  return {
    ...settings,
    savedChallenges: safeRemaining,
    challengeName: targetConfig.name,
    targetCylinders: computedTotal > 0 ? computedTotal : (targetConfig.targetCylinders || 200),
    hasTimeLimit: targetConfig.hasTimeLimit,
    scheduleType: targetConfig.scheduleType,
    startDate: targetConfig.startDate,
    endDate: targetConfig.endDate,
    cadenceFrequency: targetConfig.cadenceFrequency,
    cadencePeriod: targetConfig.cadencePeriod,
    weightCategories: targetCats
  };
}

export function renameChallengeInSettings(settings, oldName, newName) {
  if (!oldName || !newName || oldName.trim().toLowerCase() === newName.trim().toLowerCase()) {
    return settings;
  }

  const currentChallenges = getSavedChallenges(settings);
  const oldTrimmed = oldName.trim().toLowerCase();
  const newTrimmed = newName.trim();

  let updatedSavedChallenges = currentChallenges.map(c => {
    if (c.name && c.name.trim().toLowerCase() === oldTrimmed) {
      return {
        ...c,
        id: newTrimmed.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        name: newTrimmed
      };
    }
    return c;
  });

  const activeIsOld = (settings.challengeName || '').trim().toLowerCase() === oldTrimmed;

  return {
    ...settings,
    savedChallenges: updatedSavedChallenges,
    challengeName: activeIsOld ? newTrimmed : settings.challengeName
  };
}
