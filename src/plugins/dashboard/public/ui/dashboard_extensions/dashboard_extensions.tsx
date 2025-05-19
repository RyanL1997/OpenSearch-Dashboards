/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { EuiErrorBoundary } from '@elastic/eui';
import React, { useMemo } from 'react';
import {
  HttpStart,
  NotificationsStart,
  SavedObjectsClientContract,
} from 'opensearch-dashboards/public';
import { DashboardPanelState } from '../../application/embeddable/types';

// Dependencies provided to dashboard extensions
export interface DashboardExtensionDependencies {
  http: HttpStart;
  notifications: NotificationsStart;
  savedObjectsClient: SavedObjectsClientContract;
  panels: { [key: string]: DashboardPanelState };
}

// Configuration for a dashboard extension
export interface DashboardExtensionConfig {
  id: string; // Unique identifier for the extension
  order: number; // Lower order means higher position in the UI
  isEnabled: () => Promise<boolean>; // Determines if the extension should be rendered
  getComponent: (dependencies: DashboardExtensionDependencies) => React.ReactElement; // Returns the component to render
}

// Registry to store dashboard extensions
const dashboardExtensions: DashboardExtensionConfig[] = [];

// Public method to register a dashboard extension
export function registerDashboardExtension(config: DashboardExtensionConfig) {
  dashboardExtensions.push(config);
}

// Getter to access the registered extensions (used internally by DashboardViewport)
export function getDashboardExtensions(): DashboardExtensionConfig[] {
  return dashboardExtensions;
}

interface DashboardExtensionProps {
  config: DashboardExtensionConfig;
  dependencies: DashboardExtensionDependencies;
}

// Component to render a single dashboard extension
const DashboardExtension: React.FC<DashboardExtensionProps> = (props) => {
  const [isEnabled, setIsEnabled] = React.useState(false);

  const component = useMemo(() => props.config.getComponent(props.dependencies), [
    props.config,
    props.dependencies,
  ]);

  React.useEffect(() => {
    props.config.isEnabled().then(setIsEnabled);
  }, [props.config]);

  if (!isEnabled) return null;

  return <EuiErrorBoundary>{component}</EuiErrorBoundary>;
};

interface DashboardExtensionsProps {
  configs?: DashboardExtensionConfig[];
  dependencies: DashboardExtensionDependencies;
}

// Component to render all registered dashboard extensions
export const DashboardExtensions: React.FC<DashboardExtensionsProps> = (props) => {
  const configs = useMemo(() => {
    if (!props.configs) return [];

    const seenIds = new Set();
    props.configs.forEach((config) => {
      if (seenIds.has(config.id)) {
        throw new Error(`Duplicate dashboard extension id '${config.id}' found.`);
      }
      seenIds.add(config.id);
    });

    return [...props.configs].sort((a, b) => a.order - b.order);
  }, [props.configs]);

  return (
    <>
      {configs.map((config) => (
        <DashboardExtension key={config.id} config={config} dependencies={props.dependencies} />
      ))}
    </>
  );
};
