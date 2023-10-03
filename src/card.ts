import { HomeAssistant, LovelaceCardEditor } from 'custom-card-helpers';
import { CSSResultGroup, LitElement, TemplateResult, html, unsafeCSS } from 'lit';
import { customElement } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { Ref, createRef, ref } from 'lit/directives/ref.js';
import { styleMap } from 'lit/directives/style-map.js';
import { ViewContext } from 'view';
import 'web-dialog';
import pkg from '../package.json';
import { actionHandler } from './action-handler-directive.js';
import './components/elements.js';
import { FrigateCardElements } from './components/elements.js';
import './components/menu.js';
import { FrigateCardMenu } from './components/menu.js';
import './components/message.js';
import { renderMessage, renderProgressIndicator } from './components/message.js';
import './components/thumbnail-carousel.js';
import './components/views.js';
import { FrigateCardViews } from './components/views.js';
import { FrigateCardConfig, MenuItem, RawFrigateCardConfig } from './config/types';
import { REPO_URL } from './const.js';
import { localize } from './localize/localize.js';
import cardStyle from './scss/card.scss';
import {
  ExtendedHomeAssistant,
  MediaLoadedInfo,
  Message,
} from './types.js';
import { frigateCardHasAction } from './utils/action.js';
import { ConditionEvaluateRequestEvent } from './utils/card-controller/conditions-manager.js';
import { CardController } from './utils/card-controller/controller';
import { MenuButtonController } from './utils/menu-controller';
import { View } from './view/view.js';

// ***************************************************************************
//                         General Card-Wide Notes
// ***************************************************************************

/** Media callbacks:
 *
 * Media elements (e.g. <video>, <img> or <canvas>) need to callback when:
 *  - Metadata is loaded / dimensions are known (for aspect-ratio)
 *  - Media is playing / paused (to avoid reloading)
 *
 * A number of different approaches used to attach event handlers to
 * get these callbacks (which need to be attached directly to the media
 * elements, which may be 'buried' down the DOM):
 *  - Extend the `ha-hls-player` and `ha-camera-stream` to specify the required
 *    hooks (as querySelecting the media elements after rendering was a fight
 *    with the Lit rendering engine and was very fragile) .
 *  - For non-Lit elements (e.g. WebRTC) query selecting after rendering.
 *  - Library provided hooks (e.g. JSMPEG)
 *  - Directly specifying hooks (e.g. for snapshot viewing with simple <img> tags)
 */

/** Actions (action/menu/ll-custom events):
 *
 * The card supports actions being configured in a number of places (e.g. tap on
 * an element, double_tap on a menu item, hold on the live view). These actions
 * are handled by frigateCardHandleActionConfig(). For Frigate-card specific
 * actions, the frigateCardHandleActionConfig() call will result in an ll-custom
 * DOM event being fired, which needs to be caught at the card level to handle.
 */

// ***************************************************************************
//                          Static Initializers
// ***************************************************************************

console.info(
  `%c FRIGATE-HASS-CARD \n` +
    `%c ${localize('common.version')} ` +
    `${pkg.version} ` +
    `${process.env.NODE_ENV === 'development' ? `(${pkg['buildDate']})` : ''}`,
  'color: pink; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).customCards = (window as any).customCards || [];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).customCards.push({
  type: 'frigate-card',
  name: localize('common.frigate_card'),
  description: localize('common.frigate_card_description'),
  preview: true,
  documentationURL: REPO_URL,
});

// ***************************************************************************
//                    Main FrigateCard Webcomponent
//
// Any non-rendering / non-lit related functionality should be added to
// CardController instead of this file.
// ***************************************************************************

@customElement('frigate-card')
class FrigateCard extends LitElement {
  protected _controller = new CardController(
    this,
    // Callback to scroll the main pane back to the top (example usecase: scrolling
    // half way down the gallery, then viewing diagnostics should result in
    // diagnostics starting at the top).
    () => this._refMain.value?.scroll({ top: 0 }),
    () => this._refMenu.value?.toggleMenu(),
    this._requestUpdateForComponentsThatUseConditions.bind(this),
  );

  protected _menuButtonController = new MenuButtonController();

  protected _refMenu: Ref<FrigateCardMenu> = createRef();
  protected _refMain: Ref<HTMLElement> = createRef();
  protected _refElements: Ref<FrigateCardElements> = createRef();
  protected _refViews: Ref<FrigateCardViews> = createRef();

  // Convenience methods for very frequently accessed attributes.
  get _config(): FrigateCardConfig | null {
    return this._controller.getConfigManager().getConfig();
  }

  get _hass(): ExtendedHomeAssistant | null {
    return this._controller.getHASSManager().getHASS();
  }

  set hass(hass: ExtendedHomeAssistant) {
    this._controller.getHASSManager().setHASS(hass);

    // Manually set hass in the menu, elements and image. This is to allow these
    // to update, without necessarily re-rendering the entire card (re-rendering
    // is expensive).
    if (this._refMenu.value) {
      this._refMenu.value.hass = hass;
    }
    if (this._refElements.value) {
      this._refElements.value.hass = hass;
    }
    if (this._refViews.value) {
      this._refViews.value.hass = hass;
    }
  }

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    return await CardController.getConfigElement();
  }

  public static getStubConfig(_: HomeAssistant, entities: string[]): FrigateCardConfig {
    return CardController.getStubConfig(entities);
  }

  protected _requestUpdateForComponentsThatUseConditions(): void {
    // Update the components that need to know about condition changes. Trigger
    // updates directly on them to them to avoid the performance hit of a entire
    // card re-render (esp. when using card-mod).
    // https://github.com/dermotduffy/frigate-hass-card/issues/678
    if (this._refViews.value) {
      this._refViews.value.conditionsManagerEpoch =
        this._controller.getConditionsManager().getEpoch() ?? undefined;
    }
    if (this._refElements.value) {
      this._refElements.value.conditionsManagerEpoch =
        this._controller.getConditionsManager().getEpoch() ?? undefined;
    }
  }

  public setConfig(config: RawFrigateCardConfig): void {
    this._controller.getConfigManager().setConfig(config);
  }

  protected shouldUpdate(): boolean {
    if (!this._controller.getInitializationManager().isInitializedMandatory()) {
      this._controller.getInitializationManager().initializeMandatory();
      return false;
    }
    return true;
  }

  protected willUpdate(): void {
    this._controller.getInitializationManager().initializeBackgroundIfNecessary();
  }

  protected _renderMenu(): TemplateResult | void {
    const view = this._controller.getViewManager().getView();
    if (!this._hass || !this._config || !view) {
      return;
    }
    return html`
      <frigate-card-menu
        ${ref(this._refMenu)}
        .hass=${this._hass}
        .menuConfig=${this._config.menu}
        .buttons=${this._menuButtonController.calculateButtons(
          this._hass,
          this._config,
          this._controller.getCameraManager(),
          view,
          {
            inExpandedMode: this._controller.getExpandManager().isExpanded(),
            inFullscreenMode: this._controller.getFullscreenManager().isInFullscreen(),
            currentMediaLoadedInfo: this._controller.getMediaLoadedInfoManager().get(),
            showCameraUIButton: this._controller.getCameraURLManager().hasCameraURL(),
            mediaPlayerController: this._controller.getMediaPlayerManager(),
            microphoneManager: this._controller.getMicrophoneManager(),
          },
        )}
        .entityRegistryManager=${this._controller.getEntityRegistryManager()}
      ></frigate-card-menu>
    `;
  }

  protected firstUpdated(): void {
    // Execute query string actions after first render is complete.
    this._controller.getQueryStringManager().executeNonViewRelated();
  }

  protected _renderInDialogIfNecessary(contents: TemplateResult): TemplateResult | void {
    if (this._controller.getExpandManager().isExpanded()) {
      return html` <web-dialog
        open
        center
        @close=${() => {
          this._controller.getExpandManager().setExpanded(false);
        }}
      >
        ${contents}
      </web-dialog>`;
    } else {
      return contents;
    }
  }

  protected render(): TemplateResult | void {
    if (!this._hass) {
      return;
    }

    const cardStyle = {
      'aspect-ratio': this._controller.getStyleManager().getAspectRatioStyle(),
    };
    const cardClasses = {
      triggered:
        !!this._controller.getTriggersManager().isTriggered() &&
        !!this._config?.view.scan.show_trigger_status,
    };
    const mainClasses = {
      main: true,
      'curve-top':
        this._config?.menu.style !== 'outside' || this._config?.menu.position !== 'top',
      'curve-bottom':
        this._config?.menu.style !== 'outside' || this._config?.menu.position === 'top',
    };

    const actions = this._controller.getActionsManager().getMergedActions();
    const renderMenuAbove =
      this._config?.menu.style === 'outside' && this._config?.menu.position === 'top';
    const cameraManager = this._controller.getCameraManager();

    // Caution: Keep the main div and the menu next to one another in order to
    // ensure the hover menu styling continues to work.
    return this._renderInDialogIfNecessary(html` <ha-card
      id="ha-card"
      .actionHandler=${actionHandler({
        hasHold: frigateCardHasAction(actions.hold_action),
        hasDoubleClick: frigateCardHasAction(actions.double_tap_action),
      })}
      class="${classMap(cardClasses)}"
      style="${styleMap(cardStyle)}"
      @frigate-card:message=${(ev: CustomEvent<Message>) =>
        this._controller.getMessageManager().setMessageIfHigherPriority(ev.detail)}
      @frigate-card:view:change=${(ev: CustomEvent<View>) =>
        this._controller.getViewManager().setView(ev.detail)}
      @frigate-card:view:change-context=${(ev: CustomEvent<ViewContext>) =>
        this._controller.getViewManager().setViewWithNewContext(ev.detail)}
      @frigate-card:media:loaded=${(ev: CustomEvent<MediaLoadedInfo>) =>
        this._controller.getMediaLoadedInfoManager().set(ev.detail)}
      @frigate-card:media:unloaded=${() =>
        this._controller.getMediaLoadedInfoManager().clear()}
      @frigate-card:media:volumechange=${
        () => this.requestUpdate() /* Refresh mute menu button */
      }
      @frigate-card:media:play=${
        () => this.requestUpdate() /* Refresh play/pause menu button */
      }
      @frigate-card:media:pause=${
        () => this.requestUpdate() /* Refresh play/pause menu button */
      }
    >
      ${renderMenuAbove ? this._renderMenu() : ''}
      <div ${ref(this._refMain)} class="${classMap(mainClasses)}">
        ${!cameraManager.isInitialized() &&
        !this._controller.getMessageManager().hasMessage()
          ? renderProgressIndicator({
              cardWideConfig: this._controller.getConfigManager().getCardWideConfig(),
            })
          : // Always want to render <frigate-card-views> even if there's a message, to
            // ensure live preload is always present (even if not displayed).
            html`<frigate-card-views
              ${ref(this._refViews)}
              .hass=${this._hass}
              .view=${this._controller.getViewManager().getView()}
              .cameraManager=${cameraManager}
              .resolvedMediaCache=${this._controller.getResolvedMediaCache()}
              .configManager=${this._controller.getConfigManager()}
              .conditionsManagerEpoch=${this._controller
                .getConditionsManager()
                ?.getEpoch()}
              .hide=${!!this._controller.getMessageManager().hasMessage()}
              .microphoneStream=${this._controller.getMicrophoneManager()?.getStream()}
            ></frigate-card-views>`}
        ${
          // Keep message rendering to last to show messages that may have been
          // generated during the render.
          renderMessage(this._controller.getMessageManager().getMessage())
        }
      </div>
      ${!renderMenuAbove ? this._renderMenu() : ''}
      ${this._config?.elements
        ? // Elements need to render after the main views so it can render 'on
          // top'.
          html` <frigate-card-elements
            ${ref(this._refElements)}
            .hass=${this._hass}
            .elements=${this._config?.elements}
            .conditionsManagerEpoch=${this._controller
              .getConditionsManager()
              ?.getEpoch()}
            @frigate-card:menu-add=${(ev: CustomEvent<MenuItem>) => {
              this._menuButtonController.addDynamicMenuButton(ev.detail);
              this.requestUpdate();
            }}
            @frigate-card:menu-remove=${(ev: CustomEvent<MenuItem>) => {
              this._menuButtonController.removeDynamicMenuButton(ev.detail);
              this.requestUpdate();
            }}
            @frigate-card:condition:evaluate=${(ev: ConditionEvaluateRequestEvent) => {
              ev.evaluation = this._controller
                .getConditionsManager()
                ?.evaluateCondition(ev.condition);
            }}
          >
          </frigate-card-elements>`
        : ``}
    </ha-card>`);
  }

  static get styles(): CSSResultGroup {
    return unsafeCSS(cardStyle);
  }

  public getCardSize(): number {
    // Lovelace card size is expressed in units of 50px.
    return this._controller.getCardElementManager().getCardHeight() / 50;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frigate-card': FrigateCard;
  }
}
