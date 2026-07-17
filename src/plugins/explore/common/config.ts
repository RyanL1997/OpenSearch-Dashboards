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
  // visualization is blocked with a "you don't have permission" toast. Stands in
  // for the future backend that will classify slow queries and check permissions.
  slowQueryGuard: schema.object({
    enabled: schema.boolean({ defaultValue: false }),
  }),
});

export type ConfigSchema = TypeOf<typeof configSchema>;
