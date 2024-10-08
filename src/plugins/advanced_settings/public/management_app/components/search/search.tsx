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

import React, { Fragment, PureComponent } from 'react';
import { i18n } from '@osd/i18n';
import { EuiSearchBar, EuiFormErrorText, Query } from '@elastic/eui';
import { getCategoryName } from '../../lib';

interface SearchProps {
  categories: string[];
  query: Query;
  onQueryChange: ({ query }: { query: Query }) => void;
}

export class Search extends PureComponent<SearchProps> {
  private categories: Array<{ value: string; name: string }> = [];

  constructor(props: SearchProps) {
    super(props);
    const { categories } = props;
    this.categories = categories.map((category) => {
      return {
        value: category,
        name: getCategoryName(category),
      };
    });
  }

  state = {
    isSearchTextValid: true,
    parseErrorMessage: null,
  };

  onChange = ({ query, error }: { query: Query | null; error: { message: string } | null }) => {
    if (error) {
      this.setState({
        isSearchTextValid: false,
        parseErrorMessage: error.message,
      });
      return;
    }

    this.setState({
      isSearchTextValid: true,
      parseErrorMessage: null,
    });
    this.props.onQueryChange({ query: query! });
  };

  render() {
    const { query } = this.props;

    const box = {
      incremental: true,
      'data-test-subj': 'settingsSearchBar',
      'aria-label': i18n.translate('advancedSettings.searchBarAriaLabel', {
        defaultMessage: 'Search advanced settings',
      }), // hack until EuiSearchBar is fixed
    };

    const filters = [
      {
        type: 'field_value_selection' as const,
        field: 'category',
        name: i18n.translate('advancedSettings.categorySearchLabel', {
          defaultMessage: 'Category',
        }),
        multiSelect: 'or' as const,
        options: this.categories,
      },
    ];

    let queryParseError;
    if (!this.state.isSearchTextValid) {
      const parseErrorMsg = i18n.translate(
        'advancedSettings.searchBar.unableToParseQueryErrorMessage',
        { defaultMessage: 'Unable to parse query' }
      );
      queryParseError = (
        <EuiFormErrorText>{`${parseErrorMsg}. ${this.state.parseErrorMessage}`}</EuiFormErrorText>
      );
    }

    /* The `onChange` and `query` attributes below throw type errors for `_AST` and `Query` because
     * OSD imports the types from the `eui` aliases which makes typescript believe that they are
     * different.
     */

    return (
      <Fragment>
        <EuiSearchBar
          compressed
          box={box}
          filters={filters}
          // @ts-expect-error
          onChange={this.onChange}
          // @ts-expect-error
          query={query}
        />
        {queryParseError}
      </Fragment>
    );
  }
}
