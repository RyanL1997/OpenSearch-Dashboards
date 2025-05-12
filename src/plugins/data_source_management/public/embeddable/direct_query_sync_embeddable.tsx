/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import ReactDOM from 'react-dom';
import {
  HttpStart,
  NotificationsStart,
  SavedObjectsClientContract,
} from 'opensearch-dashboards/public';
import { Embeddable, IContainer } from '../../../embeddable/public';
import { DirectQuerySyncEmbeddableComponent } from './direct_query_sync_embeddable_component';
import { DIRECT_QUERY_SAVED_OBJECT } from '../constants';
import {
  resolveConcreteIndex,
  fetchIndexMapping,
  extractIndexParts,
  generateRefreshQuery,
} from './utils';
import { DirectQuerySyncInput } from '../types';

export const DIRECT_QUERY_SYNC_EMBEDDABLE_TYPE = DIRECT_QUERY_SAVED_OBJECT;

/**
 * Represents a Direct Query Sync embeddable panel.
 */
export class DirectQuerySyncEmbeddable extends Embeddable<DirectQuerySyncInput> {
  public readonly type = DIRECT_QUERY_SYNC_EMBEDDABLE_TYPE;
  private domNode?: HTMLElement;
  private http: HttpStart;
  private notifications: NotificationsStart;
  private savedObjectsClient: SavedObjectsClientContract;
  private loadStatus?: string;
  private lastRefreshTime?: number;
  private refreshInterval?: number;
  private indexInfo?: {
    datasource: string | null;
    database: string | null;
    index: string | null;
    mdsId?: string;
  };

  constructor(
    initialInput: DirectQuerySyncInput,
    parent?: IContainer,
    http?: HttpStart,
    notifications?: NotificationsStart,
    savedObjectsClient?: SavedObjectsClientContract
  ) {
    super(initialInput, {}, parent);
    this.http = http!;
    this.notifications = notifications!;
    this.savedObjectsClient = savedObjectsClient!;

    // Fetch index info on initialization
    this.fetchIndexInfo();
  }

  public getLoadStatus(): string | undefined {
    return this.loadStatus;
  }

  public getLastRefreshTime(): number | undefined {
    return this.lastRefreshTime;
  }

  public getRefreshInterval(): number | undefined {
    return this.refreshInterval;
  }

  /**
   * Fetches index info for the panel using the dashboard's metadata and generates the sync query.
   */
  private async fetchIndexInfo() {
    try {
      // Get the dashboard ID from the parent container
      const dashboardId = await this.getDashboardId();
      if (!dashboardId) {
        throw new Error('Could not determine dashboard ID');
      }

      // Fetch the dashboard saved object
      const dashboard = await this.savedObjectsClient.get('dashboard', dashboardId);

      // Find the index pattern reference in the dashboard's references
      const indexPatternRef = dashboard.references.find(
        (ref: any) => ref.name === 'kibanaSavedObjectMeta.searchSourceJSON.index'
      );
      if (!indexPatternRef) {
        throw new Error('Index pattern reference not found in dashboard');
      }

      // Fetch the index pattern saved object
      const indexPattern = await this.savedObjectsClient.get('index-pattern', indexPatternRef.id);
      const mdsId = indexPattern.references?.find((ref: any) => ref.type === 'data-source')?.id;

      const indexTitleRaw = indexPattern.attributes.title;
      const concreteTitle = await resolveConcreteIndex(indexTitleRaw, this.http, mdsId);
      if (!concreteTitle) {
        throw new Error('Could not resolve concrete index');
      }

      const mapping = await fetchIndexMapping(concreteTitle, this.http, mdsId);
      if (!mapping) {
        throw new Error('Could not fetch index mapping');
      }

      for (const val of Object.values(mapping)) {
        const mappingName = (val as any).mappings?._meta?.name;
        const mappingProps = (val as any).mappings?._meta?.properties || {};
        this.indexInfo = {
          ...extractIndexParts(mappingName),
          mdsId,
        };
        this.lastRefreshTime = mappingProps.lastRefreshTime; // Extract from mapping, may be undefined
        this.refreshInterval = mappingProps.refreshInterval; // Extract from mapping, may be undefined
        console.log(
          `DirectQuerySyncEmbeddable: Index info - datasource: ${this.indexInfo.datasource}, database: ${this.indexInfo.database}, index: ${this.indexInfo.index}, mdsId: ${this.indexInfo.mdsId}`
        );
        console.log(
          `DirectQuerySyncEmbeddable: Extracted metadata - lastRefreshTime: ${this.lastRefreshTime}, refreshInterval: ${this.refreshInterval}`
        );

        // Generate and log the sync query
        try {
          const syncQuery = generateRefreshQuery(this.indexInfo);
          console.log('DirectQuerySyncEmbeddable: Generated sync query:', syncQuery);
        } catch (queryError) {
          console.error('DirectQuerySyncEmbeddable: Error generating sync query:', queryError);
        }
        return;
      }

      console.error('DirectQuerySyncEmbeddable: Failed to fetch index info');
    } catch (error) {
      console.error('DirectQuerySyncEmbeddable: Error fetching index info:', error);
    }
  }

  /**
   * Retrieves the dashboard ID by traversing the parent container hierarchy.
   */
  private async getDashboardId(): Promise<string | undefined> {
    let currentParent: IContainer | undefined = this.parent;
    while (currentParent) {
      if (currentParent.getInput && (currentParent as any).getInput().id) {
        const parentInput = currentParent.getInput();
        if (parentInput.id && typeof parentInput.id === 'string') {
          return parentInput.id;
        }
      }
      currentParent = currentParent.parent;
    }
    return undefined;
  }

  /**
   * Renders the DirectQuerySyncEmbeddableComponent into the provided DOM node.
   */
  public render(domNode: HTMLElement) {
    this.domNode = domNode;
    ReactDOM.render(
      <DirectQuerySyncEmbeddableComponent
        embeddable={this}
        loadStatus={this.loadStatus}
        lastRefreshTime={this.lastRefreshTime}
        refreshInterval={this.refreshInterval}
        onSynchronize={this.synchronizeNow}
      />,
      domNode
    );
  }

  /**
   * Initiates a direct query sync to refresh the data.
   */
  public synchronizeNow = () => {
    // Placeholder until we implement query generation
    console.log('DirectQuerySyncEmbeddable: synchronizeNow called');
  };

  /**
   * Reloads the embeddable, re-rendering the component.
   */
  public reload() {
    if (this.domNode) {
      this.render(this.domNode);
    }
  }

  /**
   * Cleans up the React component when the embeddable is destroyed.
   */
  public destroy() {
    super.destroy();
    if (this.domNode) {
      ReactDOM.unmountComponentAtNode(this.domNode);
    }
  }
}
