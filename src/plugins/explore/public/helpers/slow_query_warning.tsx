/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { i18n } from '@osd/i18n';
import { EuiCallOut } from '@elastic/eui';

/**
 * Complex-query warning banner (frontend PoC).
 *
 * Rendered inside the save window — the top-nav Save modal, the Add-to-dashboard modal, and
 * the in-context Save-as-visualization modal — when the `explore.slowQueryGuard.enabled`
 * feature flag is on, instead of a separate pre-save confirm dialog. One window, banner on top;
 * the user reads it and proceeds with the normal Save / Add button.
 *
 * Placeholder for the eventual backend that classifies a query as complex/slow; until then the
 * flag surfaces the banner on every save.
 */
export const SlowQueryWarningCallout = () => (
  <EuiCallOut
    title={i18n.translate('explore.slowQueryGuard.warnTitle', {
      defaultMessage: 'Complex query',
    })}
    color="warning"
    iconType="alert"
    size="s"
    data-test-subj="slowQuerySaveWarningCallout"
  >
    {i18n.translate('explore.slowQueryGuard.warnMessage', {
      defaultMessage:
        'This query can use significant cluster resources and re-runs every time the dashboard loads or refreshes.',
    })}
  </EuiCallOut>
);
