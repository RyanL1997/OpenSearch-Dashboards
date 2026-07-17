/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { schema, TypeOf } from '@osd/config-schema';
import { DEFAULT_DATA } from '../../data/common';

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  supportedTypes: schema.arrayOf(schema.string(), {
    defaultValue: [DEFAULT_DATA.SET_TYPES.INDEX, DEFAULT_DATA.SET_TYPES.INDEX_PATTERN],
  }),
  discoverTraces: schema.object({
    enabled: schema.boolean({ defaultValue: false }),
  }),
  discoverMetrics: schema.object({
    enabled: schema.boolean({ defaultValue: false }),
  }),
  agentTraces: schema.object({
    enabled: schema.boolean({ defaultValue: false }),
  }),
  sqlSupport: schema.object({
    enabled: schema.boolean({ defaultValue: false }),
  }),
  // Slow-query save gate (frontend PoC): when enabled, saving a PPL query as a
  // visualization first warns the user, who must confirm before the save runs.
  // Placeholder for the future backend that classifies slow queries.
  slowQueryGuard: schema.object({
    enabled: schema.boolean({ defaultValue: false }),
  }),
});

export type ConfigSchema = TypeOf<typeof configSchema>;
