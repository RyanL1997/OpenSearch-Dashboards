/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  IContainer,
  EmbeddableFactoryDefinition,
  EmbeddableFactory,
} from '../../../embeddable/public';
import {
  DIRECT_QUERY_SYNC_EMBEDDABLE_TYPE,
  DirectQuerySyncEmbeddable,
  DirectQuerySyncInput,
} from './direct_query_sync_embeddable';

/**
 * Factory for creating DirectQuerySyncEmbeddable instances.
 */
export class DirectQuerySyncEmbeddableFactoryDefinition
  implements EmbeddableFactoryDefinition<DirectQuerySyncInput> {
  public readonly type = DIRECT_QUERY_SYNC_EMBEDDABLE_TYPE;

  /**
   * Determines if the embeddable is editable.
   */
  public async isEditable() {
    return false; // This embeddable is not editable
  }

  /**
   * Creates a new instance of DirectQuerySyncEmbeddable.
   */
  public async create(initialInput: DirectQuerySyncInput, parent?: IContainer) {
    return new DirectQuerySyncEmbeddable(initialInput, parent);
  }

  /**
   * Creates a new instance of DirectQuerySyncEmbeddable from a saved object.
   */
  public async createFromSavedObject(
    savedObjectId: string,
    initialInput: DirectQuerySyncInput,
    parent?: IContainer
  ): Promise<DirectQuerySyncEmbeddable> {
    // Since DirectQuerySyncEmbeddable doesn't rely on saved object data,
    // we can delegate to the create method with the provided input
    return this.create(initialInput, parent);
  }

  /**
   * Returns the display name for the embeddable.
   */
  public getDisplayName() {
    return 'Direct Query Sync';
  }
}

/**
 * Type definition for the DirectQuerySyncEmbeddableFactory.
 */
export type DirectQuerySyncEmbeddableFactory = EmbeddableFactory<
  DirectQuerySyncInput,
  any,
  DirectQuerySyncEmbeddable
>;
