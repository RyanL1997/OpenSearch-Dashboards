/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { HttpStart, NotificationsStart } from 'opensearch-dashboards/public';
import { DashboardDirectQuerySync } from '../components/direct_query_data_sources_components/direct_query_dashboard_sync/direct_query_sync';
import { DirectQuerySyncEmbeddable } from './direct_query_sync_embeddable';
import { DirectQueryLoadingStatus } from '../../framework/types';
import { EMR_STATES } from '../constants';
import { useDirectQuery } from '../../framework/hooks/direct_query_hook';
import { generateRefreshQuery } from './utils';

interface DirectQuerySyncEmbeddableComponentProps {
  embeddable: DirectQuerySyncEmbeddable;
  http: HttpStart;
  notifications: NotificationsStart;
}

/**
 * React component for rendering the Direct Query Sync embeddable panel.
 */
export const DirectQuerySyncEmbeddableComponent: React.FC<DirectQuerySyncEmbeddableComponentProps> = ({
  embeddable,
  http,
  notifications,
}) => {
  // Generate the sync query from the embeddable's indexInfo
  const indexInfo = embeddable.indexInfo;
  const isLoaded = embeddable.isLoaded;
  const syncQuery = indexInfo ? generateRefreshQuery(indexInfo) : '';

  // Memoize the request object to prevent re-creation on every render
  const request = useMemo(
    () => ({
      query: syncQuery,
      lang: 'sql',
      datasource: indexInfo?.datasource ?? '',
    }),
    [indexInfo, syncQuery]
  );

  // Debug log to check indexInfo state
  console.log('DirectQuerySyncEmbeddableComponent: indexInfo state:', { isLoaded, indexInfo });

  // Use useDirectQuery to manage the sync process
  const { loadStatus, startLoading, pollingResult } = useDirectQuery(
    http,
    notifications,
    indexInfo?.mdsId
  );

  // Update the embeddable's loadStatus when the sync status changes
  useEffect(() => {
    if (loadStatus) {
      embeddable.updateLastRefreshTime(loadStatus);
    }
  }, [loadStatus, embeddable]);

  // Handle sync completion
  useEffect(() => {
    if (loadStatus === DirectQueryLoadingStatus.SUCCESS) {
      // Reload the window on success, as requested
      window.location.reload();
    }
  }, [loadStatus]);

  // Log the polling result for debugging
  useEffect(() => {
    if (pollingResult) {
      console.log('DirectQuerySyncEmbeddableComponent: Polling result:', pollingResult);
    }
  }, [pollingResult]);

  // Handle the synchronize action
  const onSynchronize = useCallback(() => {
    if (!isLoaded) {
      console.log('DirectQuerySyncEmbeddableComponent: Waiting for index info to load...');
      return;
    }
    if (!indexInfo || !indexInfo.datasource) {
      console.error(
        'DirectQuerySyncEmbeddableComponent: Cannot synchronize - indexInfo or datasource is missing'
      );
      return;
    }
    startLoading(request);
  }, [isLoaded, indexInfo, startLoading, request]); // request is now stable

  const props = {
    loadStatus,
    lastRefreshTime: embeddable.getLastRefreshTime(),
    refreshInterval: embeddable.getRefreshInterval(),
    onSynchronize,
    className: 'dashboardDirectQuerySyncBar',
    EMR_STATES,
    isSyncEnabled: isLoaded && !!indexInfo && !!indexInfo.datasource,
  };

  return (
    <div>
      <DashboardDirectQuerySync {...props} />
    </div>
  );
};
