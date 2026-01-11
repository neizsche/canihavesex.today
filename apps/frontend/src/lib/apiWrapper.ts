/**
 * API Wrapper - Direct API calls with error handling
 */

import { config } from './config.js';
import { apiJson, checkAuth, checkBackendHealth, UnauthorizedError } from './api.js';

// Re-export types
export type { Risk } from './api.js';
export { UnauthorizedError } from './api.js';

export interface TodayData {
  date: string;
  risk: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';
  explanation: string;
  analytics: {
    cycleDay: number;
    fertileWindow: boolean;
    temperatureTrend: 'stable' | 'rising' | 'falling';
  };
  disclaimer: string;
}

export interface ChartData {
  cycle: {
    id: string;
    startDate: string;
    state: string;
    peakDate: string | null;
    tempShiftConfirmedDate: string | null;
  };
  analytics: {
    cycleDay: number;
    fertileWindow: boolean;
    temperatureTrend: 'stable' | 'rising' | 'falling';
  };
  days: Array<{
    date: string;
    fertilityIndex: number;
    risk: 'HIGH' | 'MEDIUM' | 'LOW';
    temperature: number | null;
    lhTest: 'positive' | 'negative' | 'notTaken';
  }>;
  disclaimer: string;
}

/**
 * Check if backend is available
 */
export async function isBackendAvailable(): Promise<boolean> {
  try {
    return await checkBackendHealth();
  } catch {
    return false;
  }
}

/**
 * Get today's risk data
 */
export async function getTodayData(): Promise<TodayData> {
  return await apiJson('/today');
}

/**
 * Get chart data
 */
export async function getChartData(): Promise<ChartData> {
  return await apiJson('/chart');
}

/**
 * Log daily data
 */
export async function logDayData(data: any): Promise<{ ok: boolean }> {
  return await apiJson('/log-day', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Reset cycle
 */
export async function resetCycle(): Promise<{ ok: boolean }> {
  return await apiJson('/reset-cycle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Delete all user data
 */
export async function deleteAllData(): Promise<{ ok: boolean }> {
  return await apiJson('/delete-all-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Get user session
 */
export async function getUserSession(): Promise<{ userId: string | null; email: string | null }> {
  return await apiJson('/session');
}

/**
 * Check authentication status
 */
export async function isAuthenticated(): Promise<boolean> {
  return await checkAuth();
}

/**
 * Logout
 */
export async function logout(): Promise<void> {
  await apiJson('/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}