/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Embeddable, IContainer } from '../../../embeddable/public';
import { DirectQuerySyncEmbeddableComponent } from './direct_query_sync_embeddable_component';
import { DIRECT_QUERY_SAVED_OBJECT } from '../constants';

// Define the unique type identifier for this embeddable
export const DIRECT_QUERY_SYNC_EMBEDDABLE_TYPE = DIRECT_QUERY_SAVED_OBJECT;

// Define the input interface for the embeddable
export interface DirectQuerySyncInput {
  id: string;
}

/**
 * Represents a Direct Query Sync embeddable panel.
 */
export class DirectQuerySyncEmbeddable extends Embeddable<DirectQuerySyncInput> {
  public readonly type = DIRECT_QUERY_SYNC_EMBEDDABLE_TYPE;
  private domNode?: HTMLElement;

  constructor(initialInput: DirectQuerySyncInput, parent?: IContainer) {
    super(initialInput, {}, parent);
  }

  /**
   * Renders the DirectQuerySyncEmbeddableComponent into the provided DOM node.
   */
  public render(domNode: HTMLElement) {
    this.domNode = domNode;
    ReactDOM.render(<DirectQuerySyncEmbeddableComponent embeddable={this} />, domNode);
  }

  /**
   * Reloads the embeddable (no-op for now since this is a static embeddable).
   */
  public reload() {
    // No-op for now since this is a static embeddable
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
