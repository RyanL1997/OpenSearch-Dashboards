/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useState, useEffect, useContext, useMemo, Children } from 'react';
import {
  SavedObjectsClientContract,
  HttpStart,
  NotificationsStart,
} from 'opensearch-dashboards/public';
import { Subscription } from 'rxjs';
import isEqual from 'lodash/isEqual';
import {
  DirectQueryRequest,
  DirectQueryLoadingStatus,
} from '../../../../../data_source_management/public';
import { useDirectQuery } from '../../../../../data_source_management/public';
import { DirectQuerySyncService, DirectQuerySyncUIProps } from './direct_query_sync_services';
import { isDirectQuerySyncEnabledByUrl } from './direct_query_sync_url_flag';
import { DashboardPanelState } from '../types';
import { DashboardContainer } from '../dashboard_container';
import { EMR_STATES } from './direct_query_sync';
import { DashboardDirectQuerySync } from './dashboard_direct_query_sync';

interface DirectQuerySyncContextProps {
  shouldRenderSyncUI: boolean;
  syncUIProps: DirectQuerySyncUIProps;
  loadStatus: DirectQueryLoadingStatus | undefined;
  mdsId: string | undefined;
}

export const DirectQuerySyncContext = createContext<DirectQuerySyncContextProps>({
  shouldRenderSyncUI: false,
  syncUIProps: {
    lastRefreshTime: undefined,
    refreshInterval: undefined,
    onSynchronize: () => {},
  },
  loadStatus: undefined,
  mdsId: undefined,
});

interface DirectQuerySyncProviderProps {
  savedObjectsClient: SavedObjectsClientContract;
  http: HttpStart;
  notifications: NotificationsStart;
  isDirectQuerySyncEnabled: boolean;
  queryLang?: string;
  container: DashboardContainer;
  children: React.ReactNode;
}

export const DirectQuerySyncProvider: React.FC<DirectQuerySyncProviderProps> = ({
  savedObjectsClient,
  http,
  notifications,
  isDirectQuerySyncEnabled,
  queryLang,
  container,
  children,
}) => {
  console.log('DirectQuerySyncProvider: Mounting');
  console.log('DirectQuerySyncProvider: isDirectQuerySyncEnabled prop=', isDirectQuerySyncEnabled);

  // Check URL override
  const urlOverride = isDirectQuerySyncEnabledByUrl();
  console.log('DirectQuerySyncProvider: URL override=', urlOverride);

  // Align feature enable/disable logic with syncService.isDirectQuerySyncEnabled()
  const isFeatureEnabled = urlOverride !== undefined ? urlOverride : isDirectQuerySyncEnabled;
  console.log('DirectQuerySyncProvider: isFeatureEnabled=', isFeatureEnabled);

  // Log the children with more detail
  const childrenArray = Children.toArray(children);
  console.log(
    'DirectQuerySyncProvider: children=',
    childrenArray.map((child) => {
      if (React.isValidElement(child)) {
        return {
          type: child.type?.displayName || child.type?.name || 'Unknown',
          props: {
            ...child.props,
            // Avoid logging complex props that might cause circular reference issues
            container: child.props.container ? '[DashboardContainer]' : undefined,
            PanelComponent: child.props.PanelComponent ? '[Function]' : undefined,
            onSynchronize: child.props.onSynchronize ? '[Function]' : undefined,
          },
        };
      }
      return child;
    })
  );

  const [mdsId, setMdsId] = useState<string | undefined>(undefined);
  const [panels, setPanels] = useState<{ [key: string]: DashboardPanelState }>(
    container.getInput().panels
  );

  const { startLoading, loadStatus, pollingResult } = useDirectQuery(http, notifications, mdsId);

  const syncService = useMemo(() => {
    console.log('Creating new DirectQuerySyncService');
    return new DirectQuerySyncService({
      savedObjectsClient,
      http,
      startLoading: (payload: DirectQueryRequest) => {
        startLoading(payload);
      },
      setMdsId: (newMdsId?: string) => {
        setMdsId(newMdsId);
      },
      isDirectQuerySyncEnabled,
      queryLang,
    });
  }, [savedObjectsClient, http, startLoading, setMdsId, isDirectQuerySyncEnabled, queryLang]);

  // Effect for subscribing to container input changes
  useEffect(() => {
    console.log('Subscription effect: container reference=', container);
    const initialPanels = container.getInput().panels;
    console.log('Subscription effect: Initial panels on mount=', Object.keys(initialPanels));
    setPanels(initialPanels); // Ensure initial panels are set

    const subscription: Subscription = container.getInput$().subscribe(() => {
      const { panels: newPanels } = container.getInput();
      console.log('Subscription effect: newPanels=', Object.keys(newPanels));
      setPanels((prevPanels) => {
        console.log('Subscription effect: prevPanels=', Object.keys(prevPanels));
        if (isEqual(prevPanels, newPanels)) {
          console.log('Subscription effect: Panels unchanged, skipping update');
          return prevPanels;
        }
        console.log('Panels changed:', Object.keys(newPanels));
        return newPanels;
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [container]);

  // Effect for fetching metadata when panels change
  useEffect(() => {
    console.log('Fetch effect: syncService reference=', syncService);
    console.log('Fetch effect: panels=', Object.keys(panels));
    if (syncService.isDirectQuerySyncEnabled()) {
      console.log('Fetching metadata for panels:', Object.keys(panels));
      syncService.collectAllPanelMetadata(panels);
    } else {
      console.log('Not fetching metadata: syncService.isDirectQuerySyncEnabled()=false');
    }
  }, [syncService, panels]);

  // Effect for handling EMR state polling and page reload
  useEffect(() => {
    if (!loadStatus) return;

    console.log('Polling effect: loadStatus=', loadStatus);
    const emrState = EMR_STATES.get(loadStatus as string);

    if (
      emrState?.terminal &&
      loadStatus !== DirectQueryLoadingStatus.FRESH &&
      loadStatus !== DirectQueryLoadingStatus.FAILED &&
      loadStatus !== DirectQueryLoadingStatus.CANCELLED
    ) {
      console.log('Reloading page due to EMR state:', emrState);
      window.location.reload();
    }
  }, [loadStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('DirectQuerySyncProvider: Unmounting');
      syncService.destroy();
    };
  }, [syncService]);

  const shouldRenderSyncUI = isFeatureEnabled;
  const syncUIProps = syncService?.getSyncUIProps() ?? {
    lastRefreshTime: undefined,
    refreshInterval: undefined,
    onSynchronize: () => {},
  };

  console.log('DirectQuerySyncProvider: shouldRenderSyncUI=', shouldRenderSyncUI);

  const contextValue: DirectQuerySyncContextProps = {
    shouldRenderSyncUI,
    syncUIProps,
    loadStatus,
    mdsId,
  };

  console.log('DirectQuerySyncProvider: Providing context value:', {
    shouldRenderSyncUI,
    loadStatus,
    mdsId,
  });

  // Render the sync bar as a decoration above the children (DashboardViewport)
  const decoratedChildren = shouldRenderSyncUI ? (
    <>
      <DashboardDirectQuerySync
        className="dshDashboardDirectQuerySync"
        loadStatus={loadStatus}
        {...syncUIProps}
      />
      {children}
    </>
  ) : (
    children
  );

  return (
    <DirectQuerySyncContext.Provider value={contextValue}>
      {decoratedChildren}
    </DirectQuerySyncContext.Provider>
  );
};

export const useDirectQuerySync = (): DirectQuerySyncContextProps => {
  const context = useContext(DirectQuerySyncContext);
  console.log('useDirectQuerySync: Consuming context value:', context);
  return context;
};
