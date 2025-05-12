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
  private extractedIndexInfo?: {
    datasource: string | null;
    database: string | null;
    index: string | null;
    mdsId?: string;
  };
  private isIndexInfoLoaded: boolean = false;

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

  // Public getters for private properties
  public getLoadStatus(): string | undefined {
    return this.loadStatus;
  }

  public getLastRefreshTime(): number | undefined {
    return this.lastRefreshTime;
  }

  public getRefreshInterval(): number | undefined {
    return this.refreshInterval;
  }

  public get indexInfo():
    | { datasource: string | null; database: string | null; index: string | null; mdsId?: string }
    | undefined {
    return this.extractedIndexInfo;
  }

  public get isLoaded(): boolean {
    return this.isIndexInfoLoaded;
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
        this.extractedIndexInfo = {
          ...extractIndexParts(mappingName),
          mdsId,
        };
        this.lastRefreshTime = mappingProps.lastRefreshTime; // Extract from mapping, may be undefined
        this.refreshInterval = mappingProps.refreshInterval; // Extract from mapping, may be undefined
        console.log(
          `DirectQuerySyncEmbeddable: Index info - datasource: ${this.extractedIndexInfo.datasource}, database: ${this.extractedIndexInfo.database}, index: ${this.extractedIndexInfo.index}, mdsId: ${this.extractedIndexInfo.mdsId}`
        );
        console.log(
          `DirectQuerySyncEmbeddable: Extracted metadata - lastRefreshTime: ${this.lastRefreshTime}, refreshInterval: ${this.refreshInterval}`
        );

        // Generate and log the sync query
        try {
          const syncQuery = generateRefreshQuery(this.extractedIndexInfo);
          console.log('DirectQuerySyncEmbeddable: Generated sync query:', syncQuery);
        } catch (queryError) {
          console.error('DirectQuerySyncEmbeddable: Error generating sync query:', queryError);
        }
        // Mark index info as loaded
        this.isIndexInfoLoaded = true;
        // Trigger re-render after loading index info
        if (this.domNode) {
          this.render(this.domNode);
        }
        return;
      }

      console.error('DirectQuerySyncEmbeddable: Failed to fetch index info');
    } catch (error) {
      console.error('DirectQuerySyncEmbeddable: Error fetching index info:', error);
    } finally {
      // Ensure isIndexInfoLoaded is set even on error
      this.isIndexInfoLoaded = true;
      // Trigger re-render even on error
      if (this.domNode) {
        this.render(this.domNode);
      }
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
   * Initiates a direct query sync to refresh the data.
   */
  public synchronizeNow() {
    // Placeholder until the component handles the sync logic
    console.log('DirectQuerySyncEmbeddable: synchronizeNow called');
  }

  /**
   * Updates the last refresh time and load status, then re-renders the component.
   */
  public updateLastRefreshTime(newStatus?: string) {
    this.loadStatus = newStatus;
    if (this.loadStatus === 'success') {
      this.lastRefreshTime = Date.now();
    }
    if (this.domNode) {
      this.render(this.domNode);
    }
  }

  /**
   * Renders the DirectQuerySyncEmbeddableComponent into the provided DOM node.
   */
  public render(domNode: HTMLElement) {
    this.domNode = domNode;
    ReactDOM.render(
      <DirectQuerySyncEmbeddableComponent
        embeddable={this}
        http={this.http}
        notifications={this.notifications}
      />,
      domNode
    );
  }

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
