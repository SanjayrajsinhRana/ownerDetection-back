import { EmployeeRecord, ColleagueMatch } from '../types';
import { normalizePlate } from '../data/mockEmployees';

/**
 * Calculates Levenshtein distance between two strings,
 * with character confusion penalties (e.g., 0 vs O, 1 vs I, 8 vs B are considered close).
 */
function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (!a || !b) return 0.0;

  // Check if one contains the other as substring (e.g. last 4 digits "1234" or "AB1234")
  if (a.length >= 4 && b.length >= 4) {
    if (a.includes(b) || b.includes(a)) {
      return 0.88;
    }
  }

  // Normalize ambiguous OCR characters
  const cleanA = a.replace(/O/g, '0').replace(/I/g, '1').replace(/B/g, '8').replace(/S/g, '5').replace(/Z/g, '2');
  const cleanB = b.replace(/O/g, '0').replace(/I/g, '1').replace(/B/g, '8').replace(/S/g, '5').replace(/Z/g, '2');

  if (cleanA === cleanB) return 0.95;

  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  const distance = dp[m][n];
  const maxLen = Math.max(m, n);
  return Math.max(0, 1 - distance / maxLen);
}

/**
 * Searches employee database for a license plate.
 * Returns best matches sorted by score.
 */
export function findMatchingEmployees(
  queryPlate: string,
  employees: EmployeeRecord[]
): ColleagueMatch[] {
  const normalizedQuery = normalizePlate(queryPlate);
  if (!normalizedQuery) return [];

  const results: ColleagueMatch[] = [];

  for (const emp of employees) {
    const empNorm = emp.normalizedPlate || normalizePlate(emp.plateNumber);

    // 1. Exact match
    if (empNorm === normalizedQuery) {
      results.push({
        employee: emp,
        matchType: 'exact',
        score: 1.0,
      });
      continue;
    }

    // 2. Substring match (e.g. query is "AB 1234" and plate is "GJ 01 AB 1234")
    if (empNorm.endsWith(normalizedQuery) || normalizedQuery.endsWith(empNorm)) {
      results.push({
        employee: emp,
        matchType: 'exact',
        score: 0.94,
      });
      continue;
    }

    // 3. Fuzzy similarity
    const sim = calculateSimilarity(normalizedQuery, empNorm);
    if (sim >= 0.65) {
      results.push({
        employee: emp,
        matchType: 'fuzzy',
        score: sim,
      });
    }
  }

  // Sort: exact matches first, then highest score
  return results.sort((a, b) => b.score - a.score);
}

/**
 * Generates direct Google Chat DM deep links
 * Google Chat Web URL: https://chat.google.com/dm/{email}
 * Fallback to Gmail Chat URL: https://mail.google.com/chat/u/0/#chat/dm/{email}
 */
export function getGoogleChatLinks(email: string) {
  const encodedEmail = encodeURIComponent(email.trim());
  return {
    primary: `https://chat.google.com/dm/${encodedEmail}`,
    mailChat: `https://mail.google.com/chat/u/0/#chat/dm/${encodedEmail}`,
  };
}

/**
 * Generates ready-to-send car moving messages
 */
export function generateCarMoveMessage(
  employeeName: string,
  plateNumber: string,
  carModel: string,
  spotOrReason: string = 'blocking my parking spot',
  urgency: 'polite' | 'urgent' | 'meeting' = 'polite'
): string {
  const firstName = employeeName.split(' ')[0] || employeeName;
  
  if (urgency === 'urgent') {
    return `🚨 Hi ${firstName}, urgent request: your car (${plateNumber}${carModel ? ' - ' + carModel : ''}) is currently ${spotOrReason}. I need to leave immediately for an emergency/appointment. Could you please move it right away? Thank you!`;
  }
  
  if (urgency === 'meeting') {
    return `⏰ Hi ${firstName}, quick reminder: your car (${plateNumber}) is currently ${spotOrReason}. I have an off-site client meeting shortly and need to exit. Could you please move it within 5-10 mins? Thanks a lot!`;
  }

  return `👋 Hi ${firstName}, hope you're having a good day! Your vehicle (${plateNumber}${carModel ? ' - ' + carModel : ''}) is currently ${spotOrReason}. Whenever you have a moment, could you please move it so I can get out? Thank you so much!`;
}
