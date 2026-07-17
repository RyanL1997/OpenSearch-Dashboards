/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { i18n } from '@osd/i18n';
import { ExploreServices } from '../types';

/**
 * Slow-query save warning (frontend PoC).
 *
 * When the `explore.slowQueryGuard.enabled` feature flag is on, the user is warned —
 * regardless of their permissions — before an expensive PPL query is saved as a
 * visualization, because a saved query re-executes on every dashboard load/refresh.
 * The user must confirm before the normal save flow continues.
 *
 * This is a placeholder for the eventual backend that will classify a query as
 * "slow". Until that exists we can't tell slow queries apart, so the flag warns on
 * every save — enough for leadership to review the experience. The `isSlow(query)`
 * check will land at the top of this function.
 *
 * Call this at the top of a save handler and only continue when it resolves `true`.
 *
 * @returns `true` when the save should proceed (feature off, or the user confirmed);
 *          `false` when the user cancelled and the save must be aborted.
 */
export const confirmSlowQuerySave = async (
  services: Pick<ExploreServices, 'slowQueryGuardEnabled' | 'overlays'>
): Promise<boolean> => {
  if (!services.slowQueryGuardEnabled) {
    return true;
  }

  return services.overlays.openConfirm(
    i18n.translate('explore.slowQueryGuard.warnMessage', {
      defaultMessage:
        'This query is expensive to run. If you save it to a dashboard it will re-execute every time the dashboard loads or refreshes. Do you want to save it anyway?',
    }),
    {
      title: i18n.translate('explore.slowQueryGuard.warnTitle', {
        defaultMessage: 'Save this slow query?',
      }),
      confirmButtonText: i18n.translate('explore.slowQueryGuard.warnConfirm', {
        defaultMessage: 'Save anyway',
      }),
      cancelButtonText: i18n.translate('explore.slowQueryGuard.warnCancel', {
        defaultMessage: 'Cancel',
      }),
      buttonColor: 'warning',
      'data-test-subj': 'slowQuerySaveConfirmModal',
    }
  );
};
