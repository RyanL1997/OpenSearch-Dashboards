/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 *
 * Any modifications Copyright OpenSearch Contributors. See
 * GitHub history for details.
 */

/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {
  ISearchSource,
  OpenSearchQuerySortValue,
  SortDirection,
} from '../../../../../../../../../../../data/public';
import { convertTimeValueToIso } from './date_conversion';
import { OpenSearchHitRecordList, OpenSearchHitRecord } from '../context';
import { IntervalValue } from './generate_intervals';
import { OpenSearchQuerySearchAfter } from './get_opensearch_query_search_after';

interface RangeQuery {
  format: string;
  lte?: string | null;
  gte?: string | null;
}

/**
 * Fetch the hits between a given `interval` up to a maximum of `maxCount` documents.
 * The documents are sorted by `sort`
 *
 * The `searchSource` is assumed to have the appropriate index pattern
 * and filters set.
 */
export async function fetchHitsInInterval(
  searchSource: ISearchSource,
  timeField: string,
  sort: [OpenSearchQuerySortValue, OpenSearchQuerySortValue],
  sortDir: SortDirection,
  interval: IntervalValue[],
  searchAfter: OpenSearchQuerySearchAfter,
  maxCount: number,
  nanosValue: string,
  anchorId: string
): Promise<OpenSearchHitRecordList> {
  const range: RangeQuery = {
    format: 'strict_date_optional_time',
  };
  const [start, stop] = interval;

  if (start) {
    range[sortDir === SortDirection.asc ? 'gte' : 'lte'] = convertTimeValueToIso(start, nanosValue);
  }

  if (stop) {
    range[sortDir === SortDirection.asc ? 'lte' : 'gte'] = convertTimeValueToIso(stop, nanosValue);
  }
  const response = await searchSource
    .setField('size', maxCount)
    .setField('query', {
      query: {
        bool: {
          must: {
            constant_score: {
              filter: {
                range: {
                  [timeField]: range,
                },
              },
            },
          },
          must_not: {
            ids: {
              values: [anchorId],
            },
          },
        },
      },
      language: 'lucene',
    })
    .setField('searchAfter', searchAfter)
    .setField('sort', sort)
    .setField('version', true)
    .fetch();

  // TODO: There's a difference in the definition of SearchResponse and OpenSearchHitRecord
  return ((response.hits?.hits as unknown) as OpenSearchHitRecord[]) || [];
}
