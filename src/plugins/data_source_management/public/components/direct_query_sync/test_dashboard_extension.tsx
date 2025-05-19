/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { DashboardExtensionDependencies } from 'src/plugins/dashboard/public';

interface TestDashboardExtensionProps {
  dependencies: DashboardExtensionDependencies;
}

export const TestDashboardExtension: React.FC<TestDashboardExtensionProps> = ({ dependencies }) => {
  // Log the dependencies for debugging
  console.log('TestDashboardExtension: Dependencies:', {
    hasHttp: !!dependencies.http,
    hasNotifications: !!dependencies.notifications,
    hasSavedObjectsClient: !!dependencies.savedObjectsClient,
    panelCount: Object.keys(dependencies.panels).length,
  });

  return (
    <div style={{ padding: '10px', backgroundColor: '#f0f0f0', border: '1px solid #ddd' }}>
      <h3>Test Dashboard Extension</h3>
      <p>Hello World from Data Source Management Plugin!</p>
    </div>
  );
};
