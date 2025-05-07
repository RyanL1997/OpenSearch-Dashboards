/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { SavedObjectsClientContract, HttpStart } from 'src/core/public';
import { DirectQueryRequest } from '../../../../../data_source_management/public';
import { extractIndexInfoFromDashboard, generateRefreshQuery } from './direct_query_sync';
import { isDirectQuerySyncEnabledByUrl } from './direct_query_sync_url_flag';
import { DashboardPanelState } from '../../embeddable';

interface DirectQuerySyncServiceProps {
  savedObjectsClient: SavedObjectsClientContract;
  http: HttpStart;
  startLoading: (payload: DirectQueryRequest) => void;
  setMdsId?: (mdsId?: string) => void;
  isDirectQuerySyncEnabled: boolean;
  queryLang?: string;
}

interface DirectQuerySyncState {
  extractedProps: { lastRefreshTime?: number; refreshInterval?: number } | null;
  panelMetadata: Array<{ panelId: string; savedObjectId: string; type: string }>;
}

export interface DirectQuerySyncUIProps {
  lastRefreshTime?: number;
  refreshInterval?: number;
  onSynchronize: () => void;
}

export class DirectQuerySyncService {
  private savedObjectsClient: SavedObjectsClientContract;
  private http: HttpStart;
  private startLoading: (payload: DirectQueryRequest) => void;
  private setMdsId?: (mdsId?: string) => void;
  private isDirectQuerySyncEnabledProp: boolean;
  private queryLang?: string;

  private extractedDatasource: string | null = null;
  private extractedDatabase: string | null = null;
  private extractedIndex: string | null = null;
  private state: DirectQuerySyncState = {
    extractedProps: null,
    panelMetadata: [],
  };

  constructor(props: DirectQuerySyncServiceProps) {
    this.savedObjectsClient = props.savedObjectsClient;
    this.http = props.http;
    this.startLoading = props.startLoading;
    this.setMdsId = props.setMdsId;
    this.isDirectQuerySyncEnabledProp = props.isDirectQuerySyncEnabled;
    this.queryLang = props.queryLang;
  }

  /**
   * Determines if direct query sync is enabled, considering URL overrides.
   */
  public isDirectQuerySyncEnabled(): boolean {
    const urlOverride = isDirectQuerySyncEnabledByUrl();
    return urlOverride !== undefined ? urlOverride : this.isDirectQuerySyncEnabledProp;
  }

  /**
   * Determines the query language to use for direct query sync.
   * Returns the provided queryLang if specified and non-empty; otherwise, defaults to 'sql' if the feature is enabled.
   */
  public getQueryLanguage(): string {
    if (this.queryLang !== undefined && this.queryLang !== '') {
      return this.queryLang;
    }
    return this.isDirectQuerySyncEnabled() ? 'sql' : '';
  }

  /**
   * Validates if the extracted datasource, database, and index are present and valid.
   * Returns true if all values are non-null, false otherwise.
   */
  private areDataSourceParamsValid(): boolean {
    return !!this.extractedDatasource && !!this.extractedDatabase && !!this.extractedIndex;
  }

  /**
   * Collects metadata (panelId, savedObjectId, type) for all panels in the dashboard.
   * Updates the service state with extracted props and sets MDS ID if applicable.
   */
  public async collectAllPanelMetadata(panels: { [key: string]: DashboardPanelState }) {
    if (!this.isDirectQuerySyncEnabled()) return;

    let indexInfo;
    try {
      indexInfo = await extractIndexInfoFromDashboard(panels, this.savedObjectsClient, this.http);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Caught error in collectAllPanelMetadata:', error);
      indexInfo = null;
    }

    if (indexInfo) {
      this.extractedDatasource = indexInfo.parts.datasource;
      this.extractedDatabase = indexInfo.parts.database;
      this.extractedIndex = indexInfo.parts.index;
      this.state.extractedProps = indexInfo.mapping;
      if (this.setMdsId) {
        this.setMdsId(indexInfo.mdsId);
      }
    } else {
      this.extractedDatasource = null;
      this.extractedDatabase = null;
      this.extractedIndex = null;
      this.state.extractedProps = null;
      if (this.setMdsId) {
        this.setMdsId(undefined);
      }
    }
  }

  /**
   * Initiates a direct query sync to refresh the dashboard data.
   * Uses the extracted datasource, database, and index to construct a refresh query,
   * and triggers the sync process if direct query sync is enabled.
   */
  public synchronizeNow = () => {
    if (!this.isDirectQuerySyncEnabled() || !this.areDataSourceParamsValid()) return;

    const query = generateRefreshQuery({
      datasource: this.extractedDatasource!,
      database: this.extractedDatabase!,
      index: this.extractedIndex!,
    });

    this.startLoading({
      query,
      lang: this.getQueryLanguage(),
      datasource: this.extractedDatasource!,
    });
  };

  /**
   * Returns the current state of extracted properties (lastRefreshTime, refreshInterval).
   */
  public getExtractedProps(): { lastRefreshTime?: number; refreshInterval?: number } | null {
    return this.state.extractedProps;
  }

  /**
   * Determines if the direct query sync UI should be rendered.
   * Returns true if the feature is enabled and extracted props are available.
   */
  public shouldRenderSyncUI(): boolean {
    const extractedProps = this.getExtractedProps();
    return this.isDirectQuerySyncEnabled() && extractedProps !== null;
  }

  /**
   * Returns the props needed to render the direct query sync UI (excluding loadStatus).
   */
  public getSyncUIProps(): DirectQuerySyncUIProps {
    const extractedProps = this.getExtractedProps();
    return {
      lastRefreshTime: extractedProps?.lastRefreshTime,
      refreshInterval: extractedProps?.refreshInterval,
      onSynchronize: () => this.synchronizeNow(),
    };
  }

  /**
   * Updates the service with new panels, triggering metadata collection if needed.
   */
  public updatePanels(panels: { [key: string]: DashboardPanelState }) {
    if (this.isDirectQuerySyncEnabled()) {
      this.collectAllPanelMetadata(panels);
    }
  }

  /**
   * Cleans up any resources or subscriptions (if added in the future).
   */
  public destroy() {
    // Currently, no subscriptions to clean up, but this method can be extended later.
  }
}
