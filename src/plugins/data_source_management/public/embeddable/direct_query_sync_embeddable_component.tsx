/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { DirectQuerySyncEmbeddable } from './direct_query_sync_embeddable';

interface DirectQuerySyncEmbeddableComponentProps {
  embeddable: DirectQuerySyncEmbeddable;
}

/**
 * React component for rendering the Direct Query Sync embeddable panel.
 */
export const DirectQuerySyncEmbeddableComponent: React.FC<DirectQuerySyncEmbeddableComponentProps> = ({
  embeddable,
}) => {
  return (
    <div>
      <h3>Direct Query Sync Panel</h3>
      <p>ID: {embeddable.getInput().id}</p>
    </div>
  );
};
