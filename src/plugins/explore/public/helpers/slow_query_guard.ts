/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { i18n } from '@osd/i18n';
import { ExploreServices } from '../types';

/**
 * Slow-query save gate (frontend PoC).
 *
 * When the `explore.slowQueryGuard.enabled` feature flag is on, saving a PPL
 * query as a visualization is blocked and the user is shown a toast telling them
 * they don't have permission.
 *
 * This is a deliberate placeholder for the eventual backend, which will (a)
 * classify a query as "slow" and (b) check whether the user is allowed to save
 * it. Until that exists we can't tell slow queries apart, so the flag simply
 * gates every save — enough for leadership to review the experience.
 *
 * Call this at the top of a save handler and bail out when it returns `true`.
 *
 * @returns `true` when the save was blocked (a toast has already been shown to
 *          the user); `false` when the save should proceed as normal.
 */
export const isSlowQuerySaveBlocked = (
  services: Pick<ExploreServices, 'slowQueryGuardEnabled' | 'toastNotifications'>
): boolean => {
  if (!services.slowQueryGuardEnabled) {
    return false;
  }

  services.toastNotifications.addDanger({
    title: i18n.translate('explore.slowQueryGuard.blockedTitle', {
      defaultMessage: 'Query not saved',
    }),
    text: i18n.translate('explore.slowQueryGuard.blockedMessage', {
      defaultMessage:
        "You don't have permission to save queries this expensive. Contact your workspace admin to enable it.",
    }),
    'data-test-subj': 'slowQueryGuardBlockedToast',
  });

  return true;
};
