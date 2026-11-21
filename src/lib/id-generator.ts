/**
 * Generates unique, human-readable IDs for all entities.
 * Format: {PREFIX}-{YYMMDD}-{NNNNN}
 * 
 * Uses a combination of date + random to ensure uniqueness.
 * The database UNIQUE constraint is the final safety net.
 */

function padNumber(num: number, length: number): string {
  return String(num).padStart(length, '0');
}

function getDatePart(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = padNumber(now.getMonth() + 1, 2);
  const dd = padNumber(now.getDate(), 2);
  return `${yy}${mm}${dd}`;
}

function getRandomPart(): string {
  return padNumber(Math.floor(Math.random() * 99999) + 1, 5);
}

export function generatePersonId(): string {
  return `PER-${getDatePart()}-${getRandomPart()}`;
}

export function generateDonationId(): string {
  return `DON-${getDatePart()}-${getRandomPart()}`;
}

export function generateExpenseId(): string {
  return `EXP-${getDatePart()}-${getRandomPart()}`;
}

export function generateFundId(): string {
  return `FUND-${getDatePart()}-${getRandomPart()}`;
}

export function generateReceiptNo(): string {
  return `RCP-${getDatePart()}-${getRandomPart()}`;
}
