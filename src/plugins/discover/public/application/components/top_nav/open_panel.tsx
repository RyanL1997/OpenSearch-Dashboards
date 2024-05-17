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

import React, { useState, useEffect } from 'react';
import { FormattedMessage } from '@osd/i18n/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiCheckableCard,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import {
  OpenQueryContent,
  OpenQueryFooter,
  OpenSearchContent,
  OpenSearchFooter,
} from './open_content';

interface Props {
  onClose: () => void;
  makeUrl: (id: string) => string;
}

export function OpenSearchPanel({ onClose, makeUrl }: Props) {
  const [selectedCardId, setSelectedCardId] = useState<string>('openQueryCard');

  const onChangeCard = (id: string) => {
    setSelectedCardId(id);
  };

  useEffect(() => {
    setSelectedCardId('openQueryCard');
  }, []);

  return (
    <EuiFlyout ownFocus onClose={onClose} data-test-subj="loadSearchForm">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            <FormattedMessage
              id="discover.topNav.openSearchPanel.openSearchTitle"
              defaultMessage="Open"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup direction="row" gutterSize="s">
          <EuiFlexItem>
            <EuiCheckableCard
              id="openQueryCard"
              label={
                <div>
                  <strong>Open query</strong>
                  <EuiSpacer size="s" />
                  <EuiText size="s" color="subdued">
                    <p>Open a query and filters that you want to use again.</p>
                  </EuiText>
                </div>
              }
              checked={selectedCardId === 'openQueryCard'}
              onChange={() => onChangeCard('openQueryCard')}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiCheckableCard
              id="openSearchCard"
              label={
                <div>
                  <strong>Open search</strong>
                  <EuiSpacer size="s" />
                  <EuiText size="s" color="subdued">
                    <p>Open your full Discover search.</p>
                  </EuiText>
                </div>
              }
              checked={selectedCardId === 'openSearchCard'}
              onChange={() => onChangeCard('openSearchCard')}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        {selectedCardId === 'openQueryCard' && <OpenQueryContent />}
        {selectedCardId === 'openSearchCard' && <OpenSearchContent onClose={onClose} />}
      </EuiFlyoutBody>
      {selectedCardId === 'openQueryCard' && <OpenQueryFooter onClose={onClose} />}
      {selectedCardId === 'openSearchCard' && <OpenSearchFooter onClose={onClose} />}
    </EuiFlyout>
  );
}
