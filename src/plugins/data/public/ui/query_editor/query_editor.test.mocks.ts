/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { stubIndexPatternWithFields } from '../../stubs';

export const mockPersistedLog = {
  add: jest.fn(),
  get: jest.fn(() => ['response:200']),
};

export const mockPersistedLogFactory = jest.fn<jest.Mocked<typeof mockPersistedLog>, any>(() => {
  return mockPersistedLog;
});

export const mockFetchIndexPatterns = jest
  .fn()
  .mockReturnValue(Promise.resolve([stubIndexPatternWithFields]));

jest.mock('../../query/persisted_log', () => ({
  PersistedLog: mockPersistedLogFactory,
}));

jest.mock('./fetch_index_patterns', () => ({
  fetchIndexPatterns: mockFetchIndexPatterns,
}));

import _ from 'lodash';
// Using doMock to avoid hoisting so that I can override only the debounce method in lodash
jest.doMock('lodash', () => ({
  ..._,
  debounce: (func: () => any) => func,
}));
