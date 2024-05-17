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

import React from 'react';
import rison from 'rison-node';
import { i18n } from '@osd/i18n';
import { FormattedMessage } from '@osd/i18n/react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiFlyoutFooter, EuiText } from '@elastic/eui';
import { SavedObjectFinderUi } from '../../../../../saved_objects/public';
import { useOpenSearchDashboards } from '../../../../../opensearch_dashboards_react/public';
import { DiscoverViewServices } from '../../../build_services';
import { SAVED_OBJECT_TYPE } from '../../../saved_searches/_saved_search';

interface ContentProps {
  onClose: () => void;
}

export const OpenQueryContent = () => {
  return (
    <div>
      {/* Add specific content for Open Query Card here */}
      <EuiText>
        <p>This is content specifically for the Open Query card.</p>
      </EuiText>
    </div>
  );
};

export const OpenSearchContent = ({ onClose }: ContentProps) => {
  const {
    services: {
      core: { uiSettings, savedObjects, application },
    },
  } = useOpenSearchDashboards<DiscoverViewServices>();

  return (
    <div>
      <SavedObjectFinderUi
        noItemsMessage={
          <FormattedMessage
            id="discover.topNav.openSearchPanel.noSearchesFoundDescription"
            defaultMessage="No matching searches found."
          />
        }
        savedObjectMetaData={[
          {
            type: SAVED_OBJECT_TYPE,
            getIconForSavedObject: () => 'search',
            name: i18n.translate('discover.savedSearch.savedObjectName', {
              defaultMessage: 'Saved search',
            }),
          },
        ]}
        onChoose={(id) => {
          application.navigateToApp('discover', { path: `#/view/${id}` });
          onClose();
        }}
        uiSettings={uiSettings}
        savedObjects={savedObjects}
      />
    </div>
  );
};

export const OpenQueryFooter = ({ onClose }: ContentProps) => {
  return (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          {/* Add footer content specific to Open Query Card here */}
          <EuiButton onClick={onClose} fill>
            <FormattedMessage
              id="discover.topNav.openSearchPanel.closeButtonLabel"
              defaultMessage="Close"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
};

export const OpenSearchFooter = ({ onClose }: ContentProps) => {
  const {
    services: { addBasePath },
  } = useOpenSearchDashboards<DiscoverViewServices>();

  return (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
          <EuiButton
            fill
            onClick={onClose}
            href={addBasePath(
              `/app/management/opensearch-dashboards/objects?_a=${rison.encode({
                tab: SAVED_OBJECT_TYPE,
              })}`
            )}
          >
            <FormattedMessage
              id="discover.topNav.openSearchPanel.manageSearchesButtonLabel"
              defaultMessage="Manage searches"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
};
