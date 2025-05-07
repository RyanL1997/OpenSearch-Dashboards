/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { DirectQuerySyncService } from './direct_query_sync_services';
import {
  extractIndexInfoFromDashboard,
  generateRefreshQuery,
} from '../../utils/direct_query_sync/direct_query_sync';
import { isDirectQuerySyncEnabledByUrl } from '../../utils/direct_query_sync/direct_query_sync_url_flag';

// Mock dependencies
jest.mock('../../utils/direct_query_sync/direct_query_sync');
jest.mock('../../utils/direct_query_sync/direct_query_sync_url_flag');

const mockRefreshQuery = 'REFRESH MATERIALIZED VIEW `datasource`.`database`.`index`';

describe('DirectQuerySyncService', () => {
  let startLoadingSpy: jest.Mock;
  let setMdsIdSpy: jest.Mock;

  beforeEach(() => {
    startLoadingSpy = jest.fn();
    setMdsIdSpy = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isDirectQuerySyncEnabled', () => {
    let service: DirectQuerySyncService;

    beforeEach(() => {
      // Reset mocks for each test to ensure isolation
      (isDirectQuerySyncEnabledByUrl as jest.Mock).mockReset();
      service = new DirectQuerySyncService({
        savedObjectsClient: {} as any,
        http: {} as any,
        startLoading: startLoadingSpy,
        setMdsId: setMdsIdSpy,
        isDirectQuerySyncEnabled: true,
        queryLang: undefined,
      });
    });

    test('returns true when feature flag is enabled and no URL override', () => {
      (isDirectQuerySyncEnabledByUrl as jest.Mock).mockReturnValue(undefined);
      expect(service.isDirectQuerySyncEnabled()).toBe(true);
    });

    test('returns false when feature flag is disabled and no URL override', () => {
      (isDirectQuerySyncEnabledByUrl as jest.Mock).mockReturnValue(undefined);
      service = new DirectQuerySyncService({
        savedObjectsClient: {} as any,
        http: {} as any,
        startLoading: startLoadingSpy,
        setMdsId: setMdsIdSpy,
        isDirectQuerySyncEnabled: false,
        queryLang: undefined,
      });
      expect(service.isDirectQuerySyncEnabled()).toBe(false);
    });

    test('returns true when URL override is true', () => {
      (isDirectQuerySyncEnabledByUrl as jest.Mock).mockReturnValue(true);
      expect(service.isDirectQuerySyncEnabled()).toBe(true);
    });

    test('returns false when URL override is false', () => {
      (isDirectQuerySyncEnabledByUrl as jest.Mock).mockReturnValue(false);
      expect(service.isDirectQuerySyncEnabled()).toBe(false);
    });
  });

  describe('getQueryLanguage', () => {
    let service: DirectQuerySyncService;

    beforeEach(() => {
      (isDirectQuerySyncEnabledByUrl as jest.Mock).mockReset();
      service = new DirectQuerySyncService({
        savedObjectsClient: {} as any,
        http: {} as any,
        startLoading: startLoadingSpy,
        setMdsId: setMdsIdSpy,
        isDirectQuerySyncEnabled: true,
        queryLang: undefined,
      });
    });

    test('returns sql when feature is enabled and queryLang is not provided', () => {
      (isDirectQuerySyncEnabledByUrl as jest.Mock).mockReturnValue(true);
      expect(service.getQueryLanguage()).toBe('sql');
    });

    test('returns empty string when feature is disabled and queryLang is not provided', () => {
      (isDirectQuerySyncEnabledByUrl as jest.Mock).mockReturnValue(false);
      service = new DirectQuerySyncService({
        savedObjectsClient: {} as any,
        http: {} as any,
        startLoading: startLoadingSpy,
        setMdsId: setMdsIdSpy,
        isDirectQuerySyncEnabled: false,
        queryLang: undefined,
      });
      expect(service.getQueryLanguage()).toBe('');
    });

    test('returns provided queryLang when specified, regardless of feature flag', () => {
      // Feature flag disabled
      (isDirectQuerySyncEnabledByUrl as jest.Mock).mockReturnValue(false);
      service = new DirectQuerySyncService({
        savedObjectsClient: {} as any,
        http: {} as any,
        startLoading: startLoadingSpy,
        setMdsId: setMdsIdSpy,
        isDirectQuerySyncEnabled: false,
        queryLang: 'ppl',
      });
      expect(service.getQueryLanguage()).toBe('ppl');

      // Feature flag enabled
      (isDirectQuerySyncEnabledByUrl as jest.Mock).mockReturnValue(true);
      service = new DirectQuerySyncService({
        savedObjectsClient: {} as any,
        http: {} as any,
        startLoading: startLoadingSpy,
        setMdsId: setMdsIdSpy,
        isDirectQuerySyncEnabled: true,
        queryLang: 'ppl',
      });
      expect(service.getQueryLanguage()).toBe('ppl');
    });

    test('returns sql when queryLang is an empty string and feature is enabled', () => {
      service = new DirectQuerySyncService({
        savedObjectsClient: {} as any,
        http: {} as any,
        startLoading: startLoadingSpy,
        setMdsId: setMdsIdSpy,
        isDirectQuerySyncEnabled: true,
        queryLang: '',
      });
      expect(service.getQueryLanguage()).toBe('sql');
    });

    test('returns empty string when queryLang is an empty string and feature is disabled', () => {
      (isDirectQuerySyncEnabledByUrl as jest.Mock).mockReturnValue(false);
      service = new DirectQuerySyncService({
        savedObjectsClient: {} as any,
        http: {} as any,
        startLoading: startLoadingSpy,
        setMdsId: setMdsIdSpy,
        isDirectQuerySyncEnabled: false,
        queryLang: '',
      });
      expect(service.getQueryLanguage()).toBe('');
    });
  });

  describe('areDataSourceParamsValid', () => {
    let service: DirectQuerySyncService;

    beforeEach(() => {
      (extractIndexInfoFromDashboard as jest.Mock).mockReset();
      (isDirectQuerySyncEnabledByUrl as jest.Mock).mockReturnValue(true);
      service = new DirectQuerySyncService({
        savedObjectsClient: {} as any,
        http: {} as any,
        startLoading: startLoadingSpy,
        setMdsId: setMdsIdSpy,
        isDirectQuerySyncEnabled: true,
        queryLang: undefined,
      });
      // Use jest.spyOn to mock private methods
      jest.spyOn(DirectQuerySyncService.prototype as any, 'areDataSourceParamsValid');
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    test('returns true for valid datasource params', async () => {
      (extractIndexInfoFromDashboard as jest.Mock).mockResolvedValue({
        parts: {
          datasource: 'datasource',
          database: 'database',
          index: 'index',
        },
        mapping: { lastRefreshTime: 12345, refreshInterval: 30000 },
        mdsId: 'mds-1',
      });

      await service.collectAllPanelMetadata({} as any);
      expect((service as any).areDataSourceParamsValid()).toBe(true);
    });

    test('returns false for invalid datasource params', async () => {
      (extractIndexInfoFromDashboard as jest.Mock).mockResolvedValue(null);

      await service.collectAllPanelMetadata({} as any);
      expect((service as any).areDataSourceParamsValid()).toBe(false);
    });

    test('returns false when only some params are missing', async () => {
      (extractIndexInfoFromDashboard as jest.Mock).mockResolvedValue({
        parts: {
          datasource: 'datasource',
          database: null, // Missing database
          index: 'index',
        },
        mapping: { lastRefreshTime: 12345, refreshInterval: 30000 },
        mdsId: 'mds-1',
      });

      await service.collectAllPanelMetadata({} as any);
      expect((service as any).areDataSourceParamsValid()).toBe(false);
    });
  });

  describe('synchronizeNow', () => {
    let service: DirectQuerySyncService;

    beforeEach(() => {
      (generateRefreshQuery as jest.Mock).mockReturnValue(mockRefreshQuery);
      (extractIndexInfoFromDashboard as jest.Mock).mockReset();
      (isDirectQuerySyncEnabledByUrl as jest.Mock).mockReturnValue(true);
      service = new DirectQuerySyncService({
        savedObjectsClient: {} as any,
        http: {} as any,
        startLoading: startLoadingSpy,
        setMdsId: setMdsIdSpy,
        isDirectQuerySyncEnabled: true,
        queryLang: undefined,
      });
      // Set up valid datasource params for all tests
      (extractIndexInfoFromDashboard as jest.Mock).mockResolvedValue({
        parts: {
          datasource: 'datasource',
          database: 'database',
          index: 'index',
        },
        mapping: { lastRefreshTime: 12345, refreshInterval: 30000 },
        mdsId: 'mds-1',
      });
      jest.spyOn(DirectQuerySyncService.prototype as any, 'areDataSourceParamsValid');
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    test('triggers REFRESH query generation and startLoading', async () => {
      await service.collectAllPanelMetadata({} as any);
      service.synchronizeNow();

      expect(generateRefreshQuery).toHaveBeenCalledWith({
        datasource: 'datasource',
        database: 'database',
        index: 'index',
      });
      expect(startLoadingSpy).toHaveBeenCalledWith({
        query: mockRefreshQuery,
        lang: 'sql',
        datasource: 'datasource',
      });
    });

    test('does nothing when feature flag is disabled', async () => {
      (isDirectQuerySyncEnabledByUrl as jest.Mock).mockReturnValue(false);
      service = new DirectQuerySyncService({
        savedObjectsClient: {} as any,
        http: {} as any,
        startLoading: startLoadingSpy,
        setMdsId: setMdsIdSpy,
        isDirectQuerySyncEnabled: false,
        queryLang: undefined,
      });

      await service.collectAllPanelMetadata({} as any);
      service.synchronizeNow();
      expect(startLoadingSpy).not.toHaveBeenCalled();
    });

    test('does nothing when datasource params are invalid', async () => {
      (extractIndexInfoFromDashboard as jest.Mock).mockResolvedValue(null);

      await service.collectAllPanelMetadata({} as any);
      service.synchronizeNow();

      expect(startLoadingSpy).not.toHaveBeenCalled();
    });

    test('uses sql when feature is enabled and queryLang is not provided', async () => {
      await service.collectAllPanelMetadata({} as any);
      service.synchronizeNow();

      expect(startLoadingSpy).toHaveBeenCalledWith({
        query: mockRefreshQuery,
        lang: 'sql',
        datasource: 'datasource',
      });
    });

    test('uses provided queryLang when specified', async () => {
      service = new DirectQuerySyncService({
        savedObjectsClient: {} as any,
        http: {} as any,
        startLoading: startLoadingSpy,
        setMdsId: setMdsIdSpy,
        isDirectQuerySyncEnabled: true,
        queryLang: 'ppl',
      });

      await service.collectAllPanelMetadata({} as any);
      service.synchronizeNow();

      expect(startLoadingSpy).toHaveBeenCalledWith({
        query: mockRefreshQuery,
        lang: 'ppl',
        datasource: 'datasource',
      });
    });

    test('uses sql when queryLang is empty and feature is enabled', async () => {
      service = new DirectQuerySyncService({
        savedObjectsClient: {} as any,
        http: {} as any,
        startLoading: startLoadingSpy,
        setMdsId: setMdsIdSpy,
        isDirectQuerySyncEnabled: true,
        queryLang: '',
      });

      await service.collectAllPanelMetadata({} as any);
      service.synchronizeNow();

      expect(startLoadingSpy).toHaveBeenCalledWith({
        query: mockRefreshQuery,
        lang: 'sql',
        datasource: 'datasource',
      });
    });

    test('uses empty string when queryLang is empty and feature is disabled', async () => {
      (isDirectQuerySyncEnabledByUrl as jest.Mock).mockReturnValue(false);
      service = new DirectQuerySyncService({
        savedObjectsClient: {} as any,
        http: {} as any,
        startLoading: startLoadingSpy,
        setMdsId: setMdsIdSpy,
        isDirectQuerySyncEnabled: false,
        queryLang: '',
      });

      await service.collectAllPanelMetadata({} as any);
      service.synchronizeNow();

      expect(startLoadingSpy).not.toHaveBeenCalled();
    });
  });

  describe('collectAllPanelMetadata', () => {
    let service: DirectQuerySyncService;

    beforeEach(() => {
      (extractIndexInfoFromDashboard as jest.Mock).mockReset();
      (isDirectQuerySyncEnabledByUrl as jest.Mock).mockReset();
      service = new DirectQuerySyncService({
        savedObjectsClient: {} as any,
        http: {} as any,
        startLoading: startLoadingSpy,
        setMdsId: setMdsIdSpy,
        isDirectQuerySyncEnabled: true,
        queryLang: undefined,
      });
    });

    test('sets extracted props and MDS ID when metadata is available', async () => {
      (extractIndexInfoFromDashboard as jest.Mock).mockResolvedValue({
        parts: {
          datasource: 'datasource',
          database: 'database',
          index: 'index',
        },
        mapping: { lastRefreshTime: 12345, refreshInterval: 30000 },
        mdsId: 'mds-1',
      });

      await service.collectAllPanelMetadata({} as any);

      expect(service.getExtractedProps()).toEqual({
        lastRefreshTime: 12345,
        refreshInterval: 30000,
      });
      expect(setMdsIdSpy).toHaveBeenCalledWith('mds-1');
    });

    test('clears extracted props and MDS ID when metadata is not available', async () => {
      (extractIndexInfoFromDashboard as jest.Mock).mockResolvedValue(null);

      await service.collectAllPanelMetadata({} as any);

      expect(service.getExtractedProps()).toBeNull();
      expect(setMdsIdSpy).toHaveBeenCalledWith(undefined);
    });

    test('does not collect metadata when feature is disabled', async () => {
      (isDirectQuerySyncEnabledByUrl as jest.Mock).mockReturnValue(false);
      service = new DirectQuerySyncService({
        savedObjectsClient: {} as any,
        http: {} as any,
        startLoading: startLoadingSpy,
        setMdsId: setMdsIdSpy,
        isDirectQuerySyncEnabled: false,
        queryLang: undefined,
      });

      await service.collectAllPanelMetadata({} as any);

      expect(extractIndexInfoFromDashboard).not.toHaveBeenCalled();
      expect(service.getExtractedProps()).toBeNull();
      expect(setMdsIdSpy).not.toHaveBeenCalled();
    });

    test('handles errors from extractIndexInfoFromDashboard', async () => {
      (extractIndexInfoFromDashboard as jest.Mock).mockRejectedValue(
        new Error('Failed to extract index info')
      );

      await service.collectAllPanelMetadata({} as any);

      expect(service.getExtractedProps()).toBeNull();
      expect(setMdsIdSpy).toHaveBeenCalledWith(undefined);
    });

    test('updates extracted props on subsequent calls with different metadata', async () => {
      (extractIndexInfoFromDashboard as jest.Mock).mockResolvedValueOnce({
        parts: {
          datasource: 'datasource1',
          database: 'database1',
          index: 'index1',
        },
        mapping: { lastRefreshTime: 12345, refreshInterval: 30000 },
        mdsId: 'mds-1',
      });

      await service.collectAllPanelMetadata({} as any);
      expect(service.getExtractedProps()).toEqual({
        lastRefreshTime: 12345,
        refreshInterval: 30000,
      });
      expect(setMdsIdSpy).toHaveBeenCalledWith('mds-1');

      (extractIndexInfoFromDashboard as jest.Mock).mockResolvedValueOnce({
        parts: {
          datasource: 'datasource2',
          database: 'database2',
          index: 'index2',
        },
        mapping: { lastRefreshTime: 67890, refreshInterval: 60000 },
        mdsId: 'mds-2',
      });

      await service.collectAllPanelMetadata({} as any);
      expect(service.getExtractedProps()).toEqual({
        lastRefreshTime: 67890,
        refreshInterval: 60000,
      });
      expect(setMdsIdSpy).toHaveBeenCalledWith('mds-2');
    });
  });

  describe('updatePanels', () => {
    let service: DirectQuerySyncService;

    beforeEach(() => {
      (isDirectQuerySyncEnabledByUrl as jest.Mock).mockReset();
      service = new DirectQuerySyncService({
        savedObjectsClient: {} as any,
        http: {} as any,
        startLoading: startLoadingSpy,
        setMdsId: setMdsIdSpy,
        isDirectQuerySyncEnabled: true,
        queryLang: undefined,
      });
    });

    test('calls collectAllPanelMetadata when feature is enabled', async () => {
      (isDirectQuerySyncEnabledByUrl as jest.Mock).mockReturnValue(true);
      (extractIndexInfoFromDashboard as jest.Mock).mockResolvedValue({
        parts: {
          datasource: 'datasource',
          database: 'database',
          index: 'index',
        },
        mapping: { lastRefreshTime: 12345, refreshInterval: 30000 },
        mdsId: 'mds-1',
      });

      const spy = jest.spyOn(service, 'collectAllPanelMetadata');
      await service.updatePanels({} as any);

      expect(spy).toHaveBeenCalledWith({});
    });

    test('does not call collectAllPanelMetadata when feature is disabled', async () => {
      (isDirectQuerySyncEnabledByUrl as jest.Mock).mockReturnValue(false);
      service = new DirectQuerySyncService({
        savedObjectsClient: {} as any,
        http: {} as any,
        startLoading: startLoadingSpy,
        setMdsId: setMdsIdSpy,
        isDirectQuerySyncEnabled: false,
        queryLang: undefined,
      });

      const spy = jest.spyOn(service, 'collectAllPanelMetadata');
      await service.updatePanels({} as any);

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    let service: DirectQuerySyncService;

    beforeEach(() => {
      service = new DirectQuerySyncService({
        savedObjectsClient: {} as any,
        http: {} as any,
        startLoading: startLoadingSpy,
        setMdsId: setMdsIdSpy,
        isDirectQuerySyncEnabled: true,
        queryLang: undefined,
      });
    });

    test('does not throw errors', () => {
      expect(() => service.destroy()).not.toThrow();
    });
  });
});
