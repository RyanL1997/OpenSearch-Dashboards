/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { HttpStart, SavedObjectsClientContract } from 'src/core/public';
import { i18n } from '@osd/i18n';
import { DSL_MAPPING, DSL_BASE } from '../../framework/utils/shared';

interface IndexExtractionResult {
  datasource: string | null;
  database: string | null;
  index: string | null;
}

export const MAX_ORD = 100;

export function intervalAsMinutes(interval: number): string {
  const minutes = Math.floor(interval / 60000);
  return minutes === 1
    ? i18n.translate('dataSourcesManagement.directQuerySync.intervalAsMinutes.oneMinute', {
        defaultMessage: '1 minute',
      })
    : i18n.translate('dataSourcesManagement.directQuerySync.intervalAsMinutes.multipleMinutes', {
        defaultMessage: '{minutes} minutes',
        values: { minutes },
      });
}

export async function resolveConcreteIndex(
  indexTitle: string,
  http: HttpStart,
  mdsId?: string
): Promise<string | null> {
  if (!indexTitle.includes('*')) return indexTitle;

  try {
    const query = mdsId ? { data_source: mdsId } : {};
    const resolved = await http.get(
      `/internal/index-pattern-management/resolve_index/${encodeURIComponent(indexTitle)}`,
      { query }
    );
    const matchedIndices = resolved?.indices || [];
    return matchedIndices.length > 0 ? matchedIndices[0].name : null;
  } catch (err) {
    return null;
  }
}

export function extractIndexParts(mappingName?: string): IndexExtractionResult {
  // Use mapping name if provided; otherwise, return null values
  if (mappingName) {
    const parts = mappingName.split('.');
    return {
      datasource: parts[0] || null,
      database: parts[1] || null,
      index: parts.slice(2).join('.') || null,
    };
  }

  return {
    datasource: null,
    database: null,
    index: null,
  };
}

export function generateRefreshQuery(info: IndexExtractionResult): string {
  // Ensure all required fields are non-null before constructing the query
  if (!info.datasource || !info.database || !info.index) {
    throw new Error(
      'Cannot generate refresh query: missing required datasource, database, or index'
    );
  }
  return `REFRESH MATERIALIZED VIEW \`${info.datasource}\`.\`${info.database}\`.\`${info.index}\``;
}

export async function fetchIndexMapping(
  index: string,
  http: HttpStart,
  mdsId?: string
): Promise<Record<string, any> | null> {
  try {
    const baseUrl = `${DSL_BASE}${DSL_MAPPING}`;
    const url = mdsId ? `${baseUrl}/dataSourceMDSId=${encodeURIComponent(mdsId)}` : baseUrl;
    const response = await http.get(url, {
      query: { index },
    });

    return response;
  } catch (err) {
    return null;
  }
}

/**
 * Extracts index-related information from a single panel for direct query sync.
 * Analyzes the panel's saved object to identify the index pattern, resolves it to a concrete index,
 * fetches its mapping, and extracts datasource, database, and index details along with metadata.
 * Returns null if the panel lacks an index pattern reference or if the index cannot be resolved.
 */
export async function extractIndexInfoFromPanel(
  panel: { type: string; id: string },
  savedObjectsClient: SavedObjectsClientContract,
  http: HttpStart
): Promise<{
  parts: IndexExtractionResult;
  mapping: { lastRefreshTime: number };
  mdsId?: string;
} | null> {
  try {
    const { type, id: savedObjectId } = panel;
    const savedObject = await savedObjectsClient.get(type, savedObjectId);

    const references = savedObject.references || [];

    if (references.length === 0) {
      return null;
    }

    // Check if there is any non-index-pattern reference
    if (references.some((ref: any) => ref.type !== 'index-pattern')) {
      return null;
    }

    const indexPatternRef = references.find((ref: any) => ref.type === 'index-pattern');
    if (!indexPatternRef) {
      return null;
    }

    const indexPattern = await savedObjectsClient.get('index-pattern', indexPatternRef.id);
    const mdsId =
      indexPattern.references?.find((ref: any) => ref.type === 'data-source')?.id || undefined;

    const indexTitleRaw = indexPattern.attributes.title;
    const concreteTitle = await resolveConcreteIndex(indexTitleRaw, http, mdsId);

    if (!concreteTitle) return null;

    const mapping = await fetchIndexMapping(concreteTitle, http, mdsId);
    if (!mapping) return null;

    for (const val of Object.values(mapping)) {
      const mappingName = (val as any).mappings?._meta?.name;
      return {
        mapping: (val as any).mappings._meta.properties!,
        parts: extractIndexParts(mappingName),
        mdsId,
      };
    }

    return null;
  } catch (err: any) {
    // Ignore only 404 errors (missing saved object)
    if (err?.response?.status !== 404) {
      throw err;
    }
    return null;
  }
}
