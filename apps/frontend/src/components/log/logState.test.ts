import { describe, it, expect } from 'vitest';
import {
  EMPTY_LOG_STATE,
  LogFormState,
  logFormReducer,
  encodeSymptoms,
  decodeSymptoms,
  payloadToFormState,
  suggestionToFormState,
  formStateToPayload,
  hasAdvancedData,
  hasAnyInput,
  isLogDirty,
  toggleInArray,
} from './logState';

function stateWith(overrides: Partial<LogFormState>): LogFormState {
  return { ...EMPTY_LOG_STATE, ...overrides };
}

describe('encodeSymptoms / decodeSymptoms', () => {
  it('namespaces body signals and keeps bare body symptoms', () => {
    const encoded = encodeSymptoms(
      stateWith({
        bodySymptoms: ['cramps', 'bloating'],
        mood: 'calm',
        energy: 'high',
        sleepQuality: 'good',
        libido: 'low',
        sexActivity: 'protected',
      })
    );
    expect(encoded).toEqual([
      'cramps',
      'bloating',
      'mood:calm',
      'energy:high',
      'sleep:good',
      'libido:low',
      'sex:protected',
    ]);
  });

  it('omits unset signals and treats sexActivity "none" as unset', () => {
    expect(encodeSymptoms(stateWith({ sexActivity: 'none' }))).toEqual([]);
    expect(encodeSymptoms(EMPTY_LOG_STATE)).toEqual([]);
  });

  it('round-trips through decode', () => {
    const original = stateWith({
      bodySymptoms: ['headache'],
      mood: 'sad',
      energy: 'low',
      sleepQuality: 'poor',
      libido: 'high',
      sexActivity: 'unprotected',
    });
    const decoded = decodeSymptoms(encodeSymptoms(original));
    expect(decoded).toEqual({
      bodySymptoms: ['headache'],
      mood: 'sad',
      energy: 'low',
      sleepQuality: 'poor',
      libido: 'high',
      sexActivity: 'unprotected',
    });
  });

  it('decodes an empty list to all-null signals', () => {
    expect(decodeSymptoms([])).toEqual({
      bodySymptoms: [],
      mood: null,
      energy: null,
      sleepQuality: null,
      libido: null,
      sexActivity: null,
    });
  });
});

describe('payloadToFormState', () => {
  it('maps a full payload', () => {
    const form = payloadToFormState({
      bleeding: 'heavy',
      temperature: 36.7,
      mucusType: 'eggwhite',
      lhTest: 'positive',
      disturbances: ['alcohol'],
      notes: 'hi',
      symptoms: ['cramps', 'mood:calm'],
    });
    expect(form).toMatchObject({
      bleeding: true,
      flow: 'heavy',
      spotting: false,
      bbt: '36.7',
      mucus: 'eggwhite',
      lhTest: 'positive',
      disturbances: ['alcohol'],
      notes: 'hi',
      bodySymptoms: ['cramps'],
      mood: 'calm',
    });
  });

  it('treats bleeding "spotting" as spotting, not flow', () => {
    const form = payloadToFormState({ bleeding: 'spotting' });
    expect(form.bleeding).toBe(true);
    expect(form.spotting).toBe(true);
    expect(form.flow).toBeNull();
  });

  it('treats bleeding "none" and lhTest "notTaken" as cleared', () => {
    const form = payloadToFormState({ bleeding: 'none', lhTest: 'notTaken' });
    expect(form.bleeding).toBe(false);
    expect(form.lhTest).toBeNull();
  });
});

describe('suggestionToFormState', () => {
  it('only carries bleeding, temperature and mucus; rest stays empty', () => {
    const form = suggestionToFormState({ bleeding: 'medium', temperature: 36.5, mucusType: 'dry' });
    expect(form).toEqual(
      stateWith({ bleeding: true, flow: 'medium', spotting: false, bbt: '36.5', mucus: 'dry' })
    );
  });
});

describe('formStateToPayload', () => {
  it('encodes spotting / flow / none correctly', () => {
    expect(
      formStateToPayload('2026-06-15', stateWith({ spotting: true, bleeding: true })).bleeding
    ).toBe('spotting');
    expect(
      formStateToPayload('2026-06-15', stateWith({ bleeding: true, flow: 'light' })).bleeding
    ).toBe('light');
    expect(formStateToPayload('2026-06-15', stateWith({ bleeding: true })).bleeding).toBe('medium');
    expect(formStateToPayload('2026-06-15', EMPTY_LOG_STATE).bleeding).toBe('none');
  });

  it('parses temperature and defaults lhTest', () => {
    expect(formStateToPayload('2026-06-15', stateWith({ bbt: '36.6' })).temperature).toBe(36.6);
    expect(formStateToPayload('2026-06-15', EMPTY_LOG_STATE).temperature).toBeNull();
    expect(formStateToPayload('2026-06-15', EMPTY_LOG_STATE).lhTest).toBe('notTaken');
  });

  it('round-trips payload -> form -> payload', () => {
    const payload = {
      date: '2026-06-15',
      bleeding: 'light',
      temperature: 36.8,
      mucusType: 'creamy',
      lhTest: 'negative',
      disturbances: ['sick'],
      symptoms: ['bloating', 'energy:low'],
      notes: 'note',
    };
    const back = formStateToPayload('2026-06-15', payloadToFormState(payload));
    expect(back).toEqual(payload);
  });
});

describe('predicates', () => {
  it('hasAdvancedData detects advanced fields', () => {
    expect(hasAdvancedData({})).toBe(false);
    expect(hasAdvancedData({ temperature: 36.6 })).toBe(true);
    expect(hasAdvancedData({ lhTest: 'notTaken' })).toBe(false);
    expect(hasAdvancedData({ lhTest: 'positive' })).toBe(true);
    expect(hasAdvancedData({ disturbances: ['sick'] })).toBe(true);
    expect(hasAdvancedData({ notes: 'x' })).toBe(true);
  });

  it('hasAnyInput ignores empty and sexActivity "none"', () => {
    expect(hasAnyInput(EMPTY_LOG_STATE)).toBe(false);
    expect(hasAnyInput(stateWith({ sexActivity: 'none' }))).toBe(false);
    expect(hasAnyInput(stateWith({ mood: 'calm' }))).toBe(true);
    expect(hasAnyInput(stateWith({ bbt: '36.6' }))).toBe(true);
  });

  it('isLogDirty compares scalars and arrays', () => {
    expect(isLogDirty(EMPTY_LOG_STATE, EMPTY_LOG_STATE)).toBe(false);
    expect(isLogDirty(EMPTY_LOG_STATE, stateWith({ notes: 'x' }))).toBe(true);
    expect(isLogDirty(stateWith({ bodySymptoms: ['a'] }), stateWith({ bodySymptoms: ['a'] }))).toBe(
      false
    );
    expect(
      isLogDirty(stateWith({ bodySymptoms: ['a'] }), stateWith({ bodySymptoms: ['a', 'b'] }))
    ).toBe(true);
  });
});

describe('toggleInArray', () => {
  it('adds when absent and removes when present', () => {
    expect(toggleInArray([], 'a')).toEqual(['a']);
    expect(toggleInArray(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('does not mutate the input', () => {
    const input = ['a'];
    toggleInArray(input, 'b');
    expect(input).toEqual(['a']);
  });
});

describe('logFormReducer', () => {
  it('patch merges a partial update', () => {
    const next = logFormReducer(EMPTY_LOG_STATE, { type: 'patch', patch: { mood: 'calm' } });
    expect(next.mood).toBe('calm');
    expect(next.energy).toBeNull();
    expect(next).not.toBe(EMPTY_LOG_STATE);
  });

  it('reset replaces the whole state', () => {
    const dirty = stateWith({ notes: 'x', mood: 'sad' });
    expect(logFormReducer(dirty, { type: 'reset', state: EMPTY_LOG_STATE })).toEqual(
      EMPTY_LOG_STATE
    );
  });
});
