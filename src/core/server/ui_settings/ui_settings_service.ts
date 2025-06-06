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

import { combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { firstValueFrom, mapToObject } from '@osd/std';

import { CoreService } from '../../types';
import { CoreContext } from '../core_context';
import { Logger } from '../logging';
import { SavedObjectsClientContract } from '../saved_objects/types';
import { InternalSavedObjectsServiceSetup } from '../saved_objects';
import { InternalHttpServiceSetup } from '../http';
import { UiSettingsConfigType, config as uiConfigDefinition } from './ui_settings_config';
import { UiSettingsClient } from './ui_settings_client';
import {
  InternalUiSettingsServiceSetup,
  InternalUiSettingsServiceStart,
  UiSettingsParams,
} from './types';
import { uiSettingsType } from './saved_objects';
import { registerRoutes } from './routes';
import { getCoreSettings } from './settings';
import { PermissionControlledUiSettingsWrapper } from './saved_objects/permission_controlled_ui_settings_wrapper';
import {
  savedObjectsConfig as savedObjectsDefinition,
  SavedObjectsConfigType,
} from '../saved_objects/saved_objects_config';
import {
  PERMISSION_CONTROLLED_UI_SETTINGS_WRAPPER_ID,
  PERMISSION_CONTROLLED_UI_SETTINGS_WRAPPER_PRIORITY,
} from './utils';
import { getAIFeaturesSetting } from './settings/ai_features';

export interface SetupDeps {
  http: InternalHttpServiceSetup;
  savedObjects: InternalSavedObjectsServiceSetup;
}

/** @internal */
export class UiSettingsService
  implements CoreService<InternalUiSettingsServiceSetup, InternalUiSettingsServiceStart> {
  private readonly log: Logger;
  private readonly config$: Observable<[UiSettingsConfigType, SavedObjectsConfigType]>;
  private readonly uiSettingsDefaults = new Map<string, UiSettingsParams>();
  private overrides: Record<string, any> = {};

  constructor(private readonly coreContext: CoreContext) {
    this.log = coreContext.logger.get('ui-settings-service');

    this.config$ = combineLatest([
      coreContext.configService.atPath<UiSettingsConfigType>(uiConfigDefinition.path),
      coreContext.configService.atPath<SavedObjectsConfigType>(savedObjectsDefinition.path),
    ]);
  }

  public async setup({ http, savedObjects }: SetupDeps): Promise<InternalUiSettingsServiceSetup> {
    this.log.debug('Setting up ui settings service');

    savedObjects.registerType(uiSettingsType);
    registerRoutes(http.createRouter(''));
    this.register(getCoreSettings());

    const config = await firstValueFrom(
      this.config$.pipe(
        map(([uiSettingsConfig, savedObjectsConfig]) => {
          return { uiSettingsConfig, savedObjectsConfig };
        })
      )
    );

    this.overrides = config.uiSettingsConfig.overrides || {};

    // Use uiSettings.defaults from the config file
    this.validateAndUpdateConfiguredDefaults(config.uiSettingsConfig.defaults);

    const permissionControlledUiSettingsWrapper = new PermissionControlledUiSettingsWrapper(
      config.savedObjectsConfig.permission.enabled
    );

    savedObjects.addClientWrapper(
      PERMISSION_CONTROLLED_UI_SETTINGS_WRAPPER_PRIORITY,
      PERMISSION_CONTROLLED_UI_SETTINGS_WRAPPER_ID,
      permissionControlledUiSettingsWrapper.wrapperFactory
    );

    this.register(getAIFeaturesSetting());

    return {
      register: this.register.bind(this),
    };
  }

  public async start(): Promise<InternalUiSettingsServiceStart> {
    this.validatesDefinitions();
    this.validatesOverrides();

    return {
      asScopedToClient: this.getScopedClientFactory(),
    };
  }

  public async stop() {}

  private getScopedClientFactory(): (
    savedObjectsClient: SavedObjectsClientContract
  ) => UiSettingsClient {
    const { version, buildNum } = this.coreContext.env.packageInfo;
    return (savedObjectsClient: SavedObjectsClientContract) =>
      new UiSettingsClient({
        type: 'config',
        id: version,
        buildNum,
        savedObjectsClient,
        defaults: mapToObject(this.uiSettingsDefaults),
        overrides: this.overrides,
        log: this.log,
      });
  }

  private register(settings: Record<string, UiSettingsParams> = {}) {
    Object.entries(settings).forEach(([key, value]) => {
      if (this.uiSettingsDefaults.has(key)) {
        throw new Error(`uiSettings for the key [${key}] has been already registered`);
      }
      this.uiSettingsDefaults.set(key, value);
    });
  }

  private validatesDefinitions() {
    for (const [key, definition] of this.uiSettingsDefaults) {
      if (definition.schema) {
        definition.schema.validate(definition.value, {}, `ui settings defaults [${key}]`);
      }
    }
  }

  private validatesOverrides() {
    for (const [key, value] of Object.entries(this.overrides)) {
      const definition = this.uiSettingsDefaults.get(key);
      if (definition?.schema) {
        definition.schema.validate(value, {}, `ui settings overrides [${key}]`);
      }
    }
  }

  private validateAndUpdateConfiguredDefaults(defaults: Record<string, any> = {}) {
    for (const [key, value] of Object.entries(defaults)) {
      const definition = this.uiSettingsDefaults.get(key);
      if (!definition)
        throw new Error(`[ui settings defaults [${key}]: expected key to be have been registered`);

      if (definition.schema) {
        definition.schema.validate(value, {}, `ui settings configuration [${key}]`);
      }
      definition.value = value;
    }
  }
}
