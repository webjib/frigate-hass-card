/* eslint-disable @typescript-eslint/no-explicit-any */
import { CSSResultGroup, LitElement, TemplateResult, html, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { HomeAssistant, LovelaceCardEditor, fireEvent } from 'custom-card-helpers';
import { localize } from './localize/localize.js';
import {
  BUTTON_SIZE_MIN,
  RawFrigateCardConfig,
  RawFrigateCardConfigArray,
  THUMBNAIL_WIDTH_MAX,
  THUMBNAIL_WIDTH_MIN,
  frigateCardConfigDefaults,
} from './types.js';

import {
  CONF_CAMERAS,
  CONF_CAMERAS_ARRAY_CAMERA_ENTITY,
  CONF_CAMERAS_ARRAY_CAMERA_NAME,
  CONF_CAMERAS_ARRAY_CLIENT_ID,
  CONF_CAMERAS_ARRAY_DEPENDENT_CAMERAS,
  CONF_CAMERAS_ARRAY_ICON,
  CONF_CAMERAS_ARRAY_ID,
  CONF_CAMERAS_ARRAY_LABEL,
  CONF_CAMERAS_ARRAY_LIVE_PROVIDER,
  CONF_CAMERAS_ARRAY_TITLE,
  CONF_CAMERAS_ARRAY_URL,
  CONF_CAMERAS_ARRAY_WEBRTC_CARD_ENTITY,
  CONF_CAMERAS_ARRAY_WEBRTC_CARD_URL,
  CONF_CAMERAS_ARRAY_ZONE,
  CONF_DIMENSIONS_ASPECT_RATIO,
  CONF_DIMENSIONS_ASPECT_RATIO_MODE,
  CONF_EVENT_GALLERY_CONTROLS_THUMBNAILS_SHOW_CONTROLS,
  CONF_EVENT_GALLERY_CONTROLS_THUMBNAILS_SHOW_DETAILS,
  CONF_EVENT_GALLERY_CONTROLS_THUMBNAILS_SIZE,
  CONF_EVENT_VIEWER_AUTO_PLAY,
  CONF_EVENT_VIEWER_AUTO_UNMUTE,
  CONF_EVENT_VIEWER_CONTROLS_NEXT_PREVIOUS_SIZE,
  CONF_EVENT_VIEWER_CONTROLS_NEXT_PREVIOUS_STYLE,
  CONF_EVENT_VIEWER_CONTROLS_THUMBNAILS_MODE,
  CONF_EVENT_VIEWER_CONTROLS_THUMBNAILS_SHOW_CONTROLS,
  CONF_EVENT_VIEWER_CONTROLS_THUMBNAILS_SHOW_DETAILS,
  CONF_EVENT_VIEWER_CONTROLS_THUMBNAILS_SIZE,
  CONF_EVENT_VIEWER_CONTROLS_TITLE_DURATION_SECONDS,
  CONF_EVENT_VIEWER_CONTROLS_TITLE_MODE,
  CONF_EVENT_VIEWER_DRAGGABLE,
  CONF_EVENT_VIEWER_LAZY_LOAD,
  CONF_EVENT_VIEWER_TRANSITION_EFFECT,
  CONF_IMAGE_MODE,
  CONF_IMAGE_REFRESH_SECONDS,
  CONF_IMAGE_URL,
  CONF_LIVE_AUTO_UNMUTE,
  CONF_LIVE_CONTROLS_NEXT_PREVIOUS_SIZE,
  CONF_LIVE_CONTROLS_NEXT_PREVIOUS_STYLE,
  CONF_LIVE_CONTROLS_THUMBNAILS_MEDIA,
  CONF_LIVE_CONTROLS_THUMBNAILS_MODE,
  CONF_LIVE_CONTROLS_THUMBNAILS_SHOW_CONTROLS,
  CONF_LIVE_CONTROLS_THUMBNAILS_SHOW_DETAILS,
  CONF_LIVE_CONTROLS_THUMBNAILS_SIZE,
  CONF_LIVE_CONTROLS_TITLE_DURATION_SECONDS,
  CONF_LIVE_CONTROLS_TITLE_MODE,
  CONF_LIVE_DRAGGABLE,
  CONF_LIVE_LAZY_LOAD,
  CONF_LIVE_LAZY_UNLOAD,
  CONF_LIVE_PRELOAD,
  CONF_LIVE_TRANSITION_EFFECT,
  CONF_MENU_BUTTONS_CLIPS,
  CONF_MENU_BUTTONS_FRIGATE,
  CONF_MENU_BUTTONS_FRIGATE_DOWNLOAD,
  CONF_MENU_BUTTONS_FRIGATE_FULLSCREEN,
  CONF_MENU_BUTTONS_FRIGATE_UI,
  CONF_MENU_BUTTONS_IMAGE,
  CONF_MENU_BUTTONS_LIVE,
  CONF_MENU_BUTTONS_SNAPSHOTS,
  CONF_MENU_BUTTON_SIZE,
  CONF_MENU_MODE,
  CONF_TIMELINE_CLUSTERING_THRESHOLD,
  CONF_TIMELINE_CONTROLS_THUMBNAILS_MODE,
  CONF_TIMELINE_CONTROLS_THUMBNAILS_SHOW_CONTROLS,
  CONF_TIMELINE_CONTROLS_THUMBNAILS_SHOW_DETAILS,
  CONF_TIMELINE_CONTROLS_THUMBNAILS_SIZE,
  CONF_TIMELINE_MEDIA,
  CONF_TIMELINE_WINDOW_SECONDS,
  CONF_VIEW_CAMERA_SELECT,
  CONF_VIEW_DARK_MODE,
  CONF_VIEW_DEFAULT,
  CONF_VIEW_TIMEOUT_SECONDS,
  CONF_VIEW_UPDATE_CYCLE_CAMERA,
  CONF_VIEW_UPDATE_FORCE,
  CONF_VIEW_UPDATE_SECONDS,
} from './const.js';
import {
  arrayMove,
  getCameraID,
  getCameraTitle,
} from './common.js';
import {
  copyConfig,
  deleteConfigValue,
  getArrayConfigPath,
  getConfigValue,
  isConfigUpgradeable,
  setConfigValue,
  upgradeConfig,
} from './config-mgmt.js';

import frigate_card_editor_style from './scss/editor.scss';

interface EditorOptionsSet {
  icon: string;
  name: string;
  secondary: string;
  show: boolean;
}
interface EditorOptions {
  [setName: string]: EditorOptionsSet;
}

interface EditorCameraTarget {
  cameraIndex: number;
}

interface EditorOptionSetTarget {
  optionSetName: string;
}

interface EditorSelectOption {
  value: string;
  label: string;
}

const options: EditorOptions = {
  cameras: {
    icon: 'video',
    name: localize('editor.cameras'),
    secondary: localize('editor.cameras_secondary'),
    show: true,
  },
  view: {
    icon: 'eye',
    name: localize('editor.view'),
    secondary: localize('editor.view_secondary'),
    show: false,
  },
  menu: {
    icon: 'menu',
    name: localize('editor.menu'),
    secondary: localize('editor.menu_secondary'),
    show: false,
  },
  live: {
    icon: 'cctv',
    name: localize('editor.live'),
    secondary: localize('editor.live_secondary'),
    show: false,
  },
  event_viewer: {
    icon: 'filmstrip',
    name: localize('editor.event_viewer'),
    secondary: localize('editor.event_viewer_secondary'),
    show: false,
  },
  event_gallery: {
    icon: 'grid',
    name: localize('editor.event_gallery'),
    secondary: localize('editor.event_gallery_secondary'),
    show: false,
  },
  image: {
    icon: 'image',
    name: localize('editor.image'),
    secondary: localize('editor.image_secondary'),
    show: false,
  },
  timeline: {
    icon: 'chart-gantt',
    name: localize('editor.timeline'),
    secondary: localize('editor.timeline_secondary'),
    show: false,
  },
  dimensions: {
    icon: 'aspect-ratio',
    name: localize('editor.dimensions'),
    secondary: localize('editor.dimensions_secondary'),
    show: false,
  },
  overrides: {
    icon: 'file-replace',
    name: localize('editor.overrides'),
    secondary: localize('editor.overrides_secondary'),
    show: false,
  },
};

@customElement('frigate-card-editor')
export class FrigateCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() protected _config?: RawFrigateCardConfig;
  @state() protected _helpers?: any;
  protected _initialized = false;
  protected _configUpgradeable = false;

  @property({ attribute: false })
  protected _expandedCameraIndex: number | null = null;

  protected _viewModes: EditorSelectOption[] = [
    { value: '', label: '' },
    { value: 'live', label: localize('config.view.views.live') },
    { value: 'clips', label: localize('config.view.views.clips') },
    { value: 'snapshots', label: localize('config.view.views.snapshots') },
    { value: 'clip', label: localize('config.view.views.clip') },
    { value: 'snapshot', label: localize('config.view.views.snapshot') },
    { value: 'image', label: localize('config.view.views.image') },
    { value: 'timeline', label: localize('config.view.views.timeline') },
  ];

  protected _cameraSelectViewModes: EditorSelectOption[] = [
    ...this._viewModes,
    { value: 'current', label: localize('config.view.views.current') },
  ];

  protected _menuModes: EditorSelectOption[] = [
    { value: '', label: '' },
    { value: 'none', label: localize('config.menu.modes.none') },
    { value: 'hidden-top', label: localize('config.menu.modes.hidden-top') },
    { value: 'hidden-left', label: localize('config.menu.modes.hidden-left') },
    { value: 'hidden-bottom', label: localize('config.menu.modes.hidden-bottom') },
    { value: 'hidden-right', label: localize('config.menu.modes.hidden-right') },
    { value: 'overlay-top', label: localize('config.menu.modes.overlay-top') },
    { value: 'overlay-left', label: localize('config.menu.modes.overlay-left') },
    { value: 'overlay-bottom', label: localize('config.menu.modes.overlay-bottom') },
    { value: 'overlay-right', label: localize('config.menu.modes.overlay-right') },
    { value: 'hover-top', label: localize('config.menu.modes.hover-top') },
    { value: 'hover-left', label: localize('config.menu.modes.hover-left') },
    { value: 'hover-bottom', label: localize('config.menu.modes.hover-bottom') },
    { value: 'hover-right', label: localize('config.menu.modes.hover-right') },
    { value: 'above', label: localize('config.menu.modes.above') },
    { value: 'below', label: localize('config.menu.modes.below') },
  ];

  protected _eventViewerNextPreviousControlStyles: EditorSelectOption[] = [
    { value: '', label: '' },
    {
      value: 'thumbnails',
      label: localize('config.event_viewer.controls.next_previous.styles.thumbnails'),
    },
    {
      value: 'chevrons',
      label: localize('config.event_viewer.controls.next_previous.styles.chevrons'),
    },
    {
      value: 'none',
      label: localize('config.event_viewer.controls.next_previous.styles.none'),
    },
  ];

  protected _liveNextPreviousControlStyles: EditorSelectOption[] = [
    { value: '', label: '' },
    {
      value: 'chevrons',
      label: localize('config.live.controls.next_previous.styles.chevrons'),
    },
    {
      value: 'icons',
      label: localize('config.live.controls.next_previous.styles.icons'),
    },
    { value: 'none', label: localize('config.live.controls.next_previous.styles.none') },
  ];

  protected _aspectRatioModes: EditorSelectOption[] = [
    { value: '', label: '' },
    {
      value: 'dynamic',
      label: localize('config.dimensions.aspect_ratio_modes.dynamic'),
    },
    { value: 'static', label: localize('config.dimensions.aspect_ratio_modes.static') },
    {
      value: 'unconstrained',
      label: localize('config.dimensions.aspect_ratio_modes.unconstrained'),
    },
  ];

  protected _thumbnailModes: EditorSelectOption[] = [
    { value: '', label: '' },
    {
      value: 'none',
      label: localize('config.event_viewer.controls.thumbnails.modes.none'),
    },
    {
      value: 'above',
      label: localize('config.event_viewer.controls.thumbnails.modes.above'),
    },
    {
      value: 'below',
      label: localize('config.event_viewer.controls.thumbnails.modes.below'),
    },
    {
      value: 'left',
      label: localize('config.event_viewer.controls.thumbnails.modes.left'),
    },
    {
      value: 'right',
      label: localize('config.event_viewer.controls.thumbnails.modes.right'),
    },
  ];

  protected _thumbnailMedias: EditorSelectOption[] = [
    { value: '', label: '' },
    { value: 'clips', label: localize('config.live.controls.thumbnails.medias.clips') },
    {
      value: 'snapshots',
      label: localize('config.live.controls.thumbnails.medias.snapshots'),
    },
  ];

  protected _titleModes: EditorSelectOption[] = [
    { value: '', label: '' },
    { value: 'none', label: localize('config.event_viewer.controls.title.modes.none') },
    {
      value: 'popup-top-left',
      label: localize('config.event_viewer.controls.title.modes.popup-top-left'),
    },
    {
      value: 'popup-top-right',
      label: localize('config.event_viewer.controls.title.modes.popup-top-right'),
    },
    {
      value: 'popup-bottom-left',
      label: localize('config.event_viewer.controls.title.modes.popup-bottom-left'),
    },
    {
      value: 'popup-bottom-right',
      label: localize('config.event_viewer.controls.title.modes.popup-bottom-right'),
    },
  ];

  protected _transitionEffects: EditorSelectOption[] = [
    { value: '', label: '' },
    { value: 'none', label: localize('config.event_viewer.transition_effects.none') },
    { value: 'slide', label: localize('config.event_viewer.transition_effects.slide') },
  ];

  protected _imageModes: EditorSelectOption[] = [
    { value: '', label: '' },
    { value: 'camera', label: localize('config.image.modes.camera') },
    { value: 'screensaver', label: localize('config.image.modes.screensaver') },
    { value: 'url', label: localize('config.image.modes.url') },
  ];

  protected _timelineMediaTypes: EditorSelectOption[] = [
    { value: '', label: '' },
    { value: 'all', label: localize('config.timeline.medias.all') },
    { value: 'clips', label: localize('config.timeline.medias.clips') },
    { value: 'snapshots', label: localize('config.timeline.medias.snapshots') },
  ];

  protected _darkModes: EditorSelectOption[] = [
    { value: '', label: '' },
    { value: 'on', label: localize('config.view.dark_modes.on') },
    { value: 'off', label: localize('config.view.dark_modes.off') },
    { value: 'auto', label: localize('config.view.dark_modes.auto') },
  ];

  public setConfig(config: RawFrigateCardConfig): void {
    // Note: This does not use Zod to parse the configuration, so it may be
    // partially or completely invalid. It's more useful to have a partially
    // valid configuration here, to allow the user to fix the broken parts. As
    // such, RawFrigateCardConfig is used as the type.
    this._config = config;
    this._configUpgradeable = isConfigUpgradeable(config);
    this.loadCardHelpers();
  }

  protected shouldUpdate(): boolean {
    if (!this._initialized) {
      this._initialize();
    }

    return true;
  }

  protected _getEntities(domain: string): string[] {
    if (!this.hass) {
      return [];
    }
    const entities = Object.keys(this.hass.states).filter(
      (eid) => eid.substr(0, eid.indexOf('.')) === domain,
    );
    entities.sort();

    // Add a blank entry to unset a selection.
    entities.unshift('');
    return entities;
  }

  /**
   * Render an option set header
   * @param optionSetName The name of the EditorOptionsSet.
   * @returns A rendered template.
   */
  protected _renderOptionSetHeader(optionSetName: string): TemplateResult {
    const optionSet = options[optionSetName];

    return html`
      <div
        class="option option-${optionSetName}"
        @click=${this._toggleOptionHandler}
        .optionSetName=${optionSetName}
      >
        <div class="row">
          <ha-icon .icon=${`mdi:${optionSet.icon}`}></ha-icon>
          <div class="title">${optionSet.name}</div>
        </div>
        <div class="secondary">${optionSet.secondary}</div>
      </div>
    `;
  }

  /**
   * Get a localized help label for a given config path.
   * @param configPath The config path.
   * @returns A localized label.
   */
  protected _getLabel(configPath: string): string {
    // Strip out array indices from the path.
    const path = configPath
      .split('.')
      .filter((e) => !e.match(/^\[[0-9]+\]$/))
      .join('.');
    return localize(`config.${path}`);
  }

  /**
   * Render an entity selector.
   * @param configPath The configuration path to set/read.
   * @param domain Only entities from this domain will be shown.
   * @returns A rendered template.
   */
  protected _renderEntitySelector(
    configPath: string,
    domain: string,
  ): TemplateResult | void {
    if (!this._config) {
      return;
    }

    return html`
      <ha-selector
        .hass=${this.hass}
        .selector=${{ entity: { domain: domain } }}
        .label=${this._getLabel(configPath)}
        .value=${getConfigValue(this._config, configPath, '')}
        .required=${false}
        @value-changed=${(ev) => this._valueChangedHandler(configPath, ev)}
      >
      </ha-selector>
    `;
  }

  /**
   * Render an option/"select" selector.
   * @param configPath The configuration path to set/read.
   * @param options The options to show in the selector.
   * @returns A rendered template.
   */
  protected _renderOptionSelector(
    configPath: string,
    options: string[] | { value: string; label: string }[],
    multiple?: boolean,
  ): TemplateResult | void {
    if (!this._config) {
      return;
    }

    return html`
      <ha-selector
        .hass=${this.hass}
        .selector=${{
          select: { mode: 'dropdown', multiple: !!multiple, options: options },
        }}
        .label=${this._getLabel(configPath)}
        .value=${getConfigValue(this._config, configPath, '')}
        .required=${false}
        @value-changed=${(ev) => this._valueChangedHandler(configPath, ev)}
      >
      </ha-selector>
    `;
  }

  /**
   * Render a number slider.
   * @param configPath Configuration path of the variable.
   * @param valueDefault The default value.
   * @param icon The icon to use on the slider.
   * @param min The minimum value.
   * @param max The maximum value.
   * @returns A rendered template.
   */
  protected _renderNumberInput(
    configPath: string,
    min?: number,
    max?: number,
  ): TemplateResult | void {
    if (!this._config) {
      return;
    }
    const value = getConfigValue(this._config, configPath);
    const mode = max === undefined ? 'box' : 'slider';

    return html`
      <ha-selector
        .hass=${this.hass}
        .selector=${{ number: { min: min || 0, max: max, mode: mode } }}
        .label=${this._getLabel(configPath)}
        .value=${value}
        .required=${false}
        @value-changed=${(ev) => this._valueChangedHandler(configPath, ev)}
      >
      </ha-selector>
    `;
  }

  /**
   * Render a simple text info box.
   * @param info The string to display.
   * @returns A rendered template.
   */
  protected _renderInfo(info: string): TemplateResult {
    return html` <span class="info">${info}</span>`;
  }

  /**
   * Get an editor title for the camera.
   * @param cameraIndex The index of the camera in the cameras array.
   * @param cameraConfig The raw camera configuration object.
   * @returns A string title.
   */
  protected _getEditorCameraTitle(
    cameraIndex: number,
    cameraConfig: RawFrigateCardConfig,
  ): string {
    return (
      getCameraTitle(this.hass, cameraConfig) ||
      localize('editor.camera') + ' #' + cameraIndex
    );
  }

  /**
   * Render a camera header.
   * @param cameraIndex The index of the camera to edit/add.
   * @param cameraConfig The configuration of the camera in question.
   * @param addNewCamera Whether or not this is a header to add a new camera.
   * @returns A rendered template.
   */
  protected _renderCameraHeader(
    cameraIndex: number,
    cameraConfig?: RawFrigateCardConfig,
    addNewCamera?: boolean,
  ): TemplateResult {
    return html`
      <div
        class="camera-header"
        @click=${this._toggleCameraHandler}
        .cameraIndex=${cameraIndex}
      >
        <ha-icon .icon=${addNewCamera ? 'mdi:video-plus' : 'mdi:video'}></ha-icon>
        <span>
          ${addNewCamera
            ? html` <span class="new-camera">
                [${localize('editor.add_new_camera')}...]
              </span>`
            : html`<span
                >${this._getEditorCameraTitle(cameraIndex, cameraConfig || {})}</span
              >`}
        </span>
      </div>
    `;
  }

  /**
   * Render a camera section.
   * @param cameras The full array of cameras.
   * @param cameraIndex The index (in the array) to render.
   * @param addNewCamera Whether or not this is a section to add a new non-existent camera.
   * @returns A rendered template.
   */
  protected _renderCamera(
    cameras: RawFrigateCardConfigArray,
    cameraIndex: number,
    addNewCamera?: boolean,
  ): TemplateResult | void {
    const liveProviders: EditorSelectOption[] = [
      { value: '', label: '' },
      { value: 'auto', label: localize('config.cameras.live_providers.auto') },
      { value: 'ha', label: localize('config.cameras.live_providers.ha') },
      {
        value: 'frigate-jsmpeg',
        label: localize('config.cameras.live_providers.frigate-jsmpeg'),
      },
      {
        value: 'webrtc-card',
        label: localize('config.cameras.live_providers.webrtc-card'),
      },
    ];

    const dependentCameras: EditorSelectOption[] = [];
    cameras.forEach((camera, index) => {
      if (index !== cameraIndex) {
        dependentCameras.push({
          value: getCameraID(camera),
          label: this._getEditorCameraTitle(index, camera),
        });
      }
    });

    // Make a new config and update the editor with changes on it,
    const modifyConfig = (func: (config: RawFrigateCardConfig) => boolean): void => {
      if (this._config) {
        const newConfig = copyConfig(this._config);
        if (func(newConfig)) {
          this._updateConfig(newConfig);
        }
      }
    };

    return html`
      ${this._renderCameraHeader(cameraIndex, cameras[cameraIndex], addNewCamera)}
      ${this._expandedCameraIndex === cameraIndex
        ? html` <div class="values">
            <div class="controls">
              <ha-icon-button
                class="button"
                .label=${localize('editor.move_up')}
                .disabled=${addNewCamera ||
                !this._config ||
                !Array.isArray(this._config.cameras) ||
                cameraIndex <= 0}
                @click=${() =>
                  !addNewCamera &&
                  modifyConfig((config: RawFrigateCardConfig): boolean => {
                    if (Array.isArray(config.cameras) && cameraIndex > 0) {
                      arrayMove(config.cameras, cameraIndex, cameraIndex - 1);
                      this._expandedCameraIndex = cameraIndex - 1;
                      return true;
                    }
                    return false;
                  })}
              >
                <ha-icon icon="mdi:arrow-up"></ha-icon>
              </ha-icon-button>
              <ha-icon-button
                class="button"
                .label=${localize('editor.move_down')}
                .disabled=${addNewCamera ||
                !this._config ||
                !Array.isArray(this._config.cameras) ||
                cameraIndex >= this._config.cameras.length - 1}
                @click=${() =>
                  !addNewCamera &&
                  modifyConfig((config: RawFrigateCardConfig): boolean => {
                    if (
                      Array.isArray(config.cameras) &&
                      cameraIndex < config.cameras.length - 1
                    ) {
                      arrayMove(config.cameras, cameraIndex, cameraIndex + 1);
                      this._expandedCameraIndex = cameraIndex + 1;
                      return true;
                    }
                    return false;
                  })}
              >
                <ha-icon icon="mdi:arrow-down"></ha-icon>
              </ha-icon-button>
              <ha-icon-button
                class="button"
                .label=${localize('editor.delete')}
                .disabled=${addNewCamera}
                @click=${() => {
                  modifyConfig((config: RawFrigateCardConfig): boolean => {
                    if (Array.isArray(config.cameras)) {
                      config.cameras.splice(cameraIndex, 1);
                      this._expandedCameraIndex = null;
                      return true;
                    }
                    return false;
                  });
                }}
              >
                <ha-icon icon="mdi:delete"></ha-icon>
              </ha-icon-button>
            </div>
            ${this._renderEntitySelector(
              getArrayConfigPath(CONF_CAMERAS_ARRAY_CAMERA_ENTITY, cameraIndex),
              'camera',
            )}
            ${this._renderStringInput(
              getArrayConfigPath(CONF_CAMERAS_ARRAY_CAMERA_NAME, cameraIndex),
            )}
            ${this._renderOptionSelector(
              getArrayConfigPath(CONF_CAMERAS_ARRAY_LIVE_PROVIDER, cameraIndex),
              liveProviders,
            )}
            ${this._renderStringInput(
              getArrayConfigPath(CONF_CAMERAS_ARRAY_URL, cameraIndex),
            )}
            ${this._renderStringInput(
              getArrayConfigPath(CONF_CAMERAS_ARRAY_LABEL, cameraIndex),
            )}
            ${this._renderStringInput(
              getArrayConfigPath(CONF_CAMERAS_ARRAY_ZONE, cameraIndex),
            )}
            ${this._renderStringInput(
              getArrayConfigPath(CONF_CAMERAS_ARRAY_CLIENT_ID, cameraIndex),
            )}
            ${this._renderStringInput(
              getArrayConfigPath(CONF_CAMERAS_ARRAY_TITLE, cameraIndex),
            )}
            ${this._renderStringInput(
              getArrayConfigPath(CONF_CAMERAS_ARRAY_ICON, cameraIndex),
            )}
            ${this._renderStringInput(
              getArrayConfigPath(CONF_CAMERAS_ARRAY_ID, cameraIndex),
            )}
            ${this._renderEntitySelector(
              getArrayConfigPath(CONF_CAMERAS_ARRAY_WEBRTC_CARD_ENTITY, cameraIndex),
              'camera',
            )}
            ${this._renderStringInput(
              getArrayConfigPath(CONF_CAMERAS_ARRAY_WEBRTC_CARD_URL, cameraIndex),
            )}
            ${this._renderOptionSelector(
              getArrayConfigPath(CONF_CAMERAS_ARRAY_DEPENDENT_CAMERAS, cameraIndex),
              dependentCameras,
              true,
            )}
          </div>`
        : ``}
    `;
  }

  /**
   * Render a string input field.
   * @param configPath The configuration path to set/read.
   * @param type The allowable input
   * @returns A rendered template.
   */
  protected _renderStringInput(
    configPath: string,
    type?:
      | 'number'
      | 'text'
      | 'search'
      | 'tel'
      | 'url'
      | 'email'
      | 'password'
      | 'date'
      | 'month'
      | 'week'
      | 'time'
      | 'datetime-local'
      | 'color',
  ): TemplateResult | void {
    if (!this._config) {
      return;
    }

    return html`
      <ha-selector
        .hass=${this.hass}
        .selector=${{ text: { type: type || 'text' } }}
        .label=${this._getLabel(configPath)}
        .value=${getConfigValue(this._config, configPath, '')}
        .required=${false}
        @value-changed=${(ev) => this._valueChangedHandler(configPath, ev)}
      >
      </ha-selector>
    `;
  }

  /**
   * Render a boolean selector.
   * @param configPath The configuration path to set/read.
   * @param valueDefault The default switch value if unset.
   * @param label An optional switch label.
   * @returns A rendered template.
   */
  protected _renderSwitch(
    configPath: string,
    valueDefault: boolean,
    label?: string,
  ): TemplateResult | void {
    if (!this._config) {
      return;
    }

    return html`
      <ha-selector
        .hass=${this.hass}
        .selector=${{ boolean: {} }}
        .label=${label || this._getLabel(configPath)}
        .value=${getConfigValue(this._config, configPath, valueDefault)}
        .required=${false}
        @value-changed=${(ev) => this._valueChangedHandler(configPath, ev)}
      >
      </ha-selector>
    `;
  }

  protected _updateConfig(config: RawFrigateCardConfig): void {
    this._config = config;
    fireEvent(this, 'config-changed', { config: this._config });
  }

  protected render(): TemplateResult | void {
    if (!this.hass || !this._helpers || !this._config) {
      return html``;
    }

    const defaults = frigateCardConfigDefaults;

    const getShowButtonLabel = (configPath: string) =>
      localize('editor.show_button') + ': ' + localize(`config.${configPath}`);

    const cameras = (getConfigValue(this._config, CONF_CAMERAS) ||
      []) as RawFrigateCardConfigArray;

    return html`
      ${this._configUpgradeable
        ? html` <div class="upgrade">
              <span>${localize('editor.upgrade_available')}</span>
              <span>
                <mwc-button
                  raised
                  label="${localize('editor.upgrade')}"
                  @click=${() => {
                    if (this._config) {
                      const upgradedConfig = copyConfig(this._config);
                      upgradeConfig(upgradedConfig);
                      this._updateConfig(upgradedConfig);
                    }
                  }}
                >
                </mwc-button>
              </span>
            </div>
            <br />`
        : html``}
      <div class="card-config">
        ${this._renderOptionSetHeader('cameras')}
        ${options.cameras.show
          ? html` <div class="cameras">
              ${cameras.map((_, index) => this._renderCamera(cameras, index))}
              ${this._renderCamera(cameras, cameras.length, true)}
            </div>`
          : ''}
        ${this._renderOptionSetHeader('view')}
        ${options.view.show
          ? html`
              <div class="values">
                ${this._renderOptionSelector(CONF_VIEW_DEFAULT, this._viewModes)}
                ${this._renderOptionSelector(
                  CONF_VIEW_CAMERA_SELECT,
                  this._cameraSelectViewModes,
                )}
                ${this._renderOptionSelector(CONF_VIEW_DARK_MODE, this._darkModes)}
                ${this._renderNumberInput(CONF_VIEW_TIMEOUT_SECONDS)}
                ${this._renderNumberInput(CONF_VIEW_UPDATE_SECONDS)}
                ${this._renderSwitch(CONF_VIEW_UPDATE_FORCE, defaults.view.update_force)}
                ${this._renderSwitch(
                  CONF_VIEW_UPDATE_CYCLE_CAMERA,
                  defaults.view.update_cycle_camera,
                )}
              </div>
            `
          : ''}
        ${this._renderOptionSetHeader('menu')}
        ${options.menu.show
          ? html`
              <div class="values">
                ${this._renderOptionSelector(CONF_MENU_MODE, this._menuModes)}
                ${this._renderNumberInput(CONF_MENU_BUTTON_SIZE, BUTTON_SIZE_MIN)}
                ${this._renderSwitch(
                  CONF_MENU_BUTTONS_FRIGATE,
                  defaults.menu.buttons.frigate,
                  getShowButtonLabel(CONF_MENU_BUTTONS_FRIGATE),
                )}
                ${this._renderSwitch(
                  CONF_MENU_BUTTONS_LIVE,
                  defaults.menu.buttons.live,
                  getShowButtonLabel('view.views.live'),
                )}
                ${this._renderSwitch(
                  CONF_MENU_BUTTONS_CLIPS,
                  defaults.menu.buttons.clips,
                  getShowButtonLabel('view.views.clips'),
                )}
                ${this._renderSwitch(
                  CONF_MENU_BUTTONS_SNAPSHOTS,
                  defaults.menu.buttons.snapshots,
                  getShowButtonLabel('view.views.snapshots'),
                )}
                ${this._renderSwitch(
                  CONF_MENU_BUTTONS_IMAGE,
                  defaults.menu.buttons.image,
                  getShowButtonLabel('view.views.image'),
                )}
                ${this._renderSwitch(
                  CONF_MENU_BUTTONS_FRIGATE_DOWNLOAD,
                  defaults.menu.buttons.download,
                  getShowButtonLabel(CONF_MENU_BUTTONS_FRIGATE_DOWNLOAD),
                )}
                ${this._renderSwitch(
                  CONF_MENU_BUTTONS_FRIGATE_UI,
                  defaults.menu.buttons.frigate_ui,
                  getShowButtonLabel(CONF_MENU_BUTTONS_FRIGATE_UI),
                )}
                ${this._renderSwitch(
                  CONF_MENU_BUTTONS_FRIGATE_FULLSCREEN,
                  defaults.menu.buttons.fullscreen,
                  getShowButtonLabel(CONF_MENU_BUTTONS_FRIGATE_FULLSCREEN),
                )}
              </div>
            `
          : ''}
        ${this._renderOptionSetHeader('live')}
        ${options.live.show
          ? html`
              <div class="values">
                ${this._renderSwitch(CONF_LIVE_PRELOAD, defaults.live.preload)}
                ${this._renderSwitch(CONF_LIVE_DRAGGABLE, defaults.live.draggable)}
                ${this._renderSwitch(CONF_LIVE_LAZY_LOAD, defaults.live.lazy_load)}
                ${this._renderSwitch(CONF_LIVE_LAZY_UNLOAD, defaults.live.lazy_unload)}
                ${this._renderSwitch(CONF_LIVE_AUTO_UNMUTE, defaults.live.auto_unmute)}
                ${this._renderOptionSelector(
                  CONF_LIVE_CONTROLS_NEXT_PREVIOUS_STYLE,
                  this._liveNextPreviousControlStyles,
                )}
                ${this._renderNumberInput(
                  CONF_LIVE_CONTROLS_NEXT_PREVIOUS_SIZE,
                  BUTTON_SIZE_MIN,
                )}
                ${this._renderOptionSelector(
                  CONF_LIVE_CONTROLS_THUMBNAILS_MODE,
                  this._thumbnailModes,
                )}
                ${this._renderOptionSelector(
                  CONF_LIVE_CONTROLS_THUMBNAILS_MEDIA,
                  this._thumbnailMedias,
                )}
                ${this._renderNumberInput(
                  CONF_LIVE_CONTROLS_THUMBNAILS_SIZE,
                  THUMBNAIL_WIDTH_MIN,
                  THUMBNAIL_WIDTH_MAX,
                )}
                ${this._renderOptionSelector(
                  CONF_LIVE_CONTROLS_TITLE_MODE,
                  this._titleModes,
                )}
                ${this._renderSwitch(
                  CONF_LIVE_CONTROLS_THUMBNAILS_SHOW_DETAILS,
                  defaults.live.controls.thumbnails.show_details,
                )}
                ${this._renderSwitch(
                  CONF_LIVE_CONTROLS_THUMBNAILS_SHOW_CONTROLS,
                  defaults.live.controls.thumbnails.show_controls,
                )}
                ${this._renderNumberInput(
                  CONF_LIVE_CONTROLS_TITLE_DURATION_SECONDS,
                  0,
                  60,
                )}
                ${this._renderOptionSelector(
                  CONF_LIVE_TRANSITION_EFFECT,
                  this._transitionEffects,
                )}
              </div>
            `
          : ''}
        ${this._renderOptionSetHeader('event_gallery')}
        ${options.event_gallery.show
          ? html` <div class="values">
              ${this._renderNumberInput(
                CONF_EVENT_GALLERY_CONTROLS_THUMBNAILS_SIZE,
                THUMBNAIL_WIDTH_MIN,
                THUMBNAIL_WIDTH_MAX,
              )}
              ${this._renderSwitch(
                CONF_EVENT_GALLERY_CONTROLS_THUMBNAILS_SHOW_DETAILS,
                defaults.event_viewer.controls.thumbnails.show_details,
              )}
              ${this._renderSwitch(
                CONF_EVENT_GALLERY_CONTROLS_THUMBNAILS_SHOW_CONTROLS,
                defaults.event_viewer.controls.thumbnails.show_controls,
              )}
            </div>`
          : ''}
        ${this._renderOptionSetHeader('event_viewer')}
        ${options.event_viewer.show
          ? html` <div class="values">
              ${this._renderSwitch(
                CONF_EVENT_VIEWER_AUTO_PLAY,
                defaults.event_viewer.auto_play,
              )}
              ${this._renderSwitch(
                CONF_EVENT_VIEWER_AUTO_UNMUTE,
                defaults.event_viewer.auto_unmute,
              )}
              ${this._renderSwitch(
                CONF_EVENT_VIEWER_DRAGGABLE,
                defaults.event_viewer.draggable,
              )}
              ${this._renderSwitch(
                CONF_EVENT_VIEWER_LAZY_LOAD,
                defaults.event_viewer.lazy_load,
              )}
              ${this._renderOptionSelector(
                CONF_EVENT_VIEWER_CONTROLS_NEXT_PREVIOUS_STYLE,
                this._eventViewerNextPreviousControlStyles,
              )}
              ${this._renderNumberInput(
                CONF_EVENT_VIEWER_CONTROLS_NEXT_PREVIOUS_SIZE,
                BUTTON_SIZE_MIN,
              )}
              ${this._renderOptionSelector(
                CONF_EVENT_VIEWER_CONTROLS_THUMBNAILS_MODE,
                this._thumbnailModes,
              )}
              ${this._renderNumberInput(
                CONF_EVENT_VIEWER_CONTROLS_THUMBNAILS_SIZE,
                THUMBNAIL_WIDTH_MIN,
                THUMBNAIL_WIDTH_MAX,
              )}
              ${this._renderSwitch(
                CONF_EVENT_VIEWER_CONTROLS_THUMBNAILS_SHOW_DETAILS,
                defaults.event_viewer.controls.thumbnails.show_details,
              )}
              ${this._renderSwitch(
                CONF_EVENT_VIEWER_CONTROLS_THUMBNAILS_SHOW_CONTROLS,
                defaults.event_viewer.controls.thumbnails.show_controls,
              )}
              ${this._renderOptionSelector(
                CONF_EVENT_VIEWER_CONTROLS_TITLE_MODE,
                this._titleModes,
              )}
              ${this._renderNumberInput(
                CONF_EVENT_VIEWER_CONTROLS_TITLE_DURATION_SECONDS,
                0,
                60,
              )}
              ${this._renderOptionSelector(
                CONF_EVENT_VIEWER_TRANSITION_EFFECT,
                this._transitionEffects,
              )}
            </div>`
          : ''}
        ${this._renderOptionSetHeader('image')}
        ${options.image.show
          ? html` <div class="values">
              ${this._renderOptionSelector(CONF_IMAGE_MODE, this._imageModes)}
              ${this._renderStringInput(CONF_IMAGE_URL)}
              ${this._renderNumberInput(CONF_IMAGE_REFRESH_SECONDS)}
            </div>`
          : ''}
        ${this._renderOptionSetHeader('timeline')}
        ${options.timeline.show
          ? html` <div class="values">
              ${this._renderNumberInput(CONF_TIMELINE_WINDOW_SECONDS)}
              ${this._renderNumberInput(CONF_TIMELINE_CLUSTERING_THRESHOLD)}
              ${this._renderOptionSelector(
                CONF_TIMELINE_MEDIA,
                this._timelineMediaTypes,
              )}
              ${this._renderOptionSelector(
                CONF_TIMELINE_CONTROLS_THUMBNAILS_MODE,
                this._thumbnailModes,
              )}
              ${this._renderNumberInput(
                CONF_TIMELINE_CONTROLS_THUMBNAILS_SIZE,
                THUMBNAIL_WIDTH_MIN,
                THUMBNAIL_WIDTH_MAX,
              )}
              ${this._renderSwitch(
                CONF_TIMELINE_CONTROLS_THUMBNAILS_SHOW_DETAILS,
                defaults.timeline.controls.thumbnails.show_details,
              )}
              ${this._renderSwitch(
                CONF_TIMELINE_CONTROLS_THUMBNAILS_SHOW_CONTROLS,
                defaults.timeline.controls.thumbnails.show_controls,
              )}
            </div>`
          : ''}
        ${this._renderOptionSetHeader('dimensions')}
        ${options.dimensions.show
          ? html` <div class="values">
              ${this._renderOptionSelector(
                CONF_DIMENSIONS_ASPECT_RATIO_MODE,
                this._aspectRatioModes,
              )}
              ${this._renderStringInput(CONF_DIMENSIONS_ASPECT_RATIO)}
            </div>`
          : ''}
        ${this._config['overrides'] !== undefined
          ? html` ${this._renderOptionSetHeader('overrides')}
            ${options.overrides.show
              ? html` <div class="values">
                  ${this._renderInfo(localize('config.overrides.info'))}
                </div>`
              : ''}`
          : html``}
      </div>
    `;
  }

  /**
   * Verify editor is initialized.
   */
  protected _initialize(): void {
    if (this.hass === undefined) return;
    if (this._config === undefined) return;
    if (this._helpers === undefined) return;

    (async (): Promise<void> => {
      // The picture-glance editor loads the ha-selectors.
      // See: https://github.com/thomasloven/hass-config/wiki/PreLoading-Lovelace-Elements
      const pictureGlance = await this._helpers.createCardElement({
        type: 'picture-glance',
        entities: [],
        camera_image: 'dummy-to-load-editor-components',
      });
      if (pictureGlance.constructor.getConfigElement) {
        await pictureGlance.constructor.getConfigElement();
        this._initialized = true;
      }
    })();
  }

  /**
   * Load card helpers.
   */
  protected async loadCardHelpers(): Promise<void> {
    this._helpers = await (window as any).loadCardHelpers();
  }

  /**
   * Display/hide a camera section.
   * @param ev The event triggering the change.
   */
  protected _toggleCameraHandler(ev: { target: EditorCameraTarget | null }): void {
    if (ev && ev.target) {
      this._expandedCameraIndex =
        this._expandedCameraIndex == ev.target.cameraIndex
          ? null
          : ev.target.cameraIndex;
    }
  }

  /**
   * Handle a toggled set of options.
   * @param ev The event triggering the change.
   */
  protected _toggleOptionHandler(ev: { target: EditorOptionSetTarget | null }): void {
    this._toggleOptionSet(ev, options);
  }

  /**
   * Toggle display of a set of options (e.g. 'Live')
   * @param ev The event triggering the change.
   * @param options The EditorOptions object.
   */
  protected _toggleOptionSet(
    ev: { target: EditorOptionSetTarget | null },
    options: EditorOptions,
  ): void {
    if (ev && ev.target) {
      const show = !options[ev.target.optionSetName].show;
      for (const [key] of Object.entries(options)) {
        options[key].show = false;
      }
      options[ev.target.optionSetName].show = show;
      this.requestUpdate();
    }
  }

  /**
   * Handle a changed option value.
   * @param ev Event triggering the change.
   */
  protected _valueChangedHandler(
    key: string,
    ev: CustomEvent<{ value: unknown }>,
  ): void {
    if (!this._config || !this.hass) {
      return;
    }

    let value;
    if (ev.detail && ev.detail.value !== undefined) {
      value = ev.detail.value;
      if (typeof value === 'string') {
        value = value.trim();
      }
    }
    if (getConfigValue(this._config, key) === value) {
      return;
    }

    const newConfig = copyConfig(this._config);
    if (value === '' || value === undefined) {
      deleteConfigValue(newConfig, key);
    } else {
      setConfigValue(newConfig, key, value);
    }
    this._updateConfig(newConfig);
  }

  /**
   * Return compiled CSS styles.
   */
  static get styles(): CSSResultGroup {
    return unsafeCSS(frigate_card_editor_style);
  }
}
