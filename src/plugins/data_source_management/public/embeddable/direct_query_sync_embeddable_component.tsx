/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { DashboardDirectQuerySync } from '../components/direct_query_data_sources_components/direct_query_dashboard_sync/direct_query_sync';
import { DirectQuerySyncEmbeddable } from './direct_query_sync_embeddable';
import { DirectQueryLoadingStatus } from '../../framework/types';
import { EMR_STATES } from '../constants';
import { intervalAsMinutes } from '../components/utils';

interface DirectQuerySyncEmbeddableComponentProps {
  embeddable: DirectQuerySyncEmbeddable;
  loadStatus?: string;
  lastRefreshTime?: number;
  refreshInterval?: number;
  onSynchronize?: () => void;
}

/**
 * React component for rendering the Direct Query Sync embeddable panel.
 */
export const DirectQuerySyncEmbeddableComponent: React.FC<DirectQuerySyncEmbeddableComponentProps> = ({
  embeddable,
  loadStatus,
  lastRefreshTime,
  refreshInterval,
  onSynchronize,
}) => {
  const effectiveLoadStatus =
    loadStatus ?? embeddable.getLoadStatus() ?? DirectQueryLoadingStatus.FRESH; // Default to SCHEDULED if undefined
  const effectiveLastRefreshTime = lastRefreshTime ?? embeddable.getLastRefreshTime(); // Use mapping value, may be undefined
  const effectiveRefreshInterval = refreshInterval ?? embeddable.getRefreshInterval(); // Use mapping value, may be undefined
  const effectiveOnSynchronize = onSynchronize ?? embeddable.synchronizeNow.bind(embeddable); // Bind the synchronizeNow method

  const props = {
    loadStatus: effectiveLoadStatus,
    lastRefreshTime: effectiveLastRefreshTime,
    refreshInterval: effectiveRefreshInterval,
    onSynchronize: effectiveOnSynchronize,
    className: 'dashboardDirectQuerySyncBar',
    EMR_STATES,
  };

  return (
    <div>
      <DashboardDirectQuerySync {...props} />
    </div>
  );
};
