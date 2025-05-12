/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { DashboardDirectQuerySync } from '../components/direct_query_data_sources_components/direct_query_dashboard_sync/direct_query_sync';
import { DirectQuerySyncEmbeddable } from './direct_query_sync_embeddable';
import { DirectQueryLoadingStatus } from '../../framework/types';
import { intervalAsMinutes } from '../components/utils';

// Mock EMR_STATES (to be replaced with the real implementation in the next step)
const mockEMRStates = new Map<DirectQueryLoadingStatus, { ord: number; terminal: boolean }>([
  [DirectQueryLoadingStatus.SUCCESS, { ord: 100, terminal: true }],
]);

interface DirectQuerySyncEmbeddableComponentProps {
  embeddable: DirectQuerySyncEmbeddable;
}

/**
 * React component for rendering the Direct Query Sync embeddable panel.
 */
export const DirectQuerySyncEmbeddableComponent: React.FC<DirectQuerySyncEmbeddableComponentProps> = ({
  embeddable,
}) => {
  // Mock props for DashboardDirectQuerySync
  const mockProps = {
    loadStatus: DirectQueryLoadingStatus.SUCCESS,
    lastRefreshTime: Date.now() - 2 * 60 * 1000, // Mock as 2 minutes ago
    refreshInterval: 300, // Mock as 5 minutes (300 seconds)
    onSynchronize: () => console.log('Manual sync triggered'),
    className: 'dashboardDirectQuerySyncBar', // Use the same className as the original component
    EMR_STATES: mockEMRStates, // Pass the mocked EMR_STATES as a prop
  };

  return (
    <div>
      <DashboardDirectQuerySync {...mockProps} />
    </div>
  );
};
