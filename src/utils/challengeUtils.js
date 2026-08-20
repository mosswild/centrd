export function isThrowInChallenge(t, challengeStartDate) {
  if (!challengeStartDate) return true;
  const resetTime = new Date(challengeStartDate).getTime();
  if (isNaN(resetTime)) return true;
  
  let throwTime;
  if (t.createdAt) {
    throwTime = new Date(t.createdAt).getTime();
  } else if (t.dateThrown) {
    // If createdAt is missing, parse dateThrown as start of day
    throwTime = new Date(t.dateThrown + 'T00:00:00').getTime();
  } else {
    return true;
  }
  
  if (isNaN(throwTime)) return true;

  // A throw counts towards the active challenge only if logged at or after resetTime
  return throwTime >= resetTime;
}
