import { HomeAssistant } from '@dermotduffy/custom-card-helpers';
import {
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
  unsafeCSS,
} from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { styleMap } from 'lit/directives/style-map.js';
import { actionHandler } from '../action-handler-directive.js';
import { MenuSubmenu, MenuSubmenuItem, MenuSubmenuSelect } from '../config/types.js';
import submenuStyle from '../scss/submenu.scss';
import {
  frigateCardHasAction,
  stopEventFromActivatingCardWideActions,
} from '../utils/action.js';
import { getEntityTitle, isHassDifferent } from '../utils/ha';
import { getEntityStateTranslation } from '../utils/ha/entity-state-translation.js';
import { EntityRegistryManager } from '../utils/ha/registry/entity/index.js';
import './icon.js';
import { Icon } from '../types.js';

interface ExtendedMenuSubmenu extends MenuSubmenu {
  // An internal version of a submenu that allows entity-based submenus (for
  // FrigateCardSubmenuSelect).
  icon: string | Icon;
}

@customElement('frigate-card-submenu')
export class FrigateCardSubmenu extends LitElement {
  @property({ attribute: false })
  public hass?: HomeAssistant;

  @property({ attribute: false })
  public submenu?: ExtendedMenuSubmenu;

  protected _renderItem(item: MenuSubmenuItem): TemplateResult | void {
    if (!this.hass) {
      return;
    }

    const title = item.title ?? getEntityTitle(this.hass, item.entity);
    const style = styleMap(item.style || {});
    return html`
      <mwc-list-item
        graphic=${ifDefined(item.icon || item.entity ? 'icon' : undefined)}
        ?twoline=${!!item.subtitle}
        ?selected=${item.selected}
        ?activated=${item.selected}
        ?disabled=${item.enabled === false}
        aria-label="${title ?? ''}"
        @action=${(ev) => {
          // Attach the action config so ascendants have access to it.
          ev.detail.config = item;
        }}
        .actionHandler=${actionHandler({
          hasHold: frigateCardHasAction(item.hold_action),
          hasDoubleClick: frigateCardHasAction(item.double_tap_action),
        })}
      >
        <span style="${style}">${title ?? ''}</span>
        ${item.subtitle
          ? html`<span slot="secondary" style="${style}">${item.subtitle}</span>`
          : ''}
        <frigate-card-icon
          slot="graphic"
          .hass=${this.hass}
          .icon=${{
            icon: item.icon,
            entity: item.entity,
          }}
          style="${style}"
        ></frigate-card-icon>
      </mwc-list-item>
    `;
  }

  protected render(): TemplateResult {
    if (!this.submenu) {
      return html``;
    }
    const items = this.submenu.items as MenuSubmenuItem[];
    const style = styleMap(this.submenu.style || {});
    return html`
      <ha-button-menu
        corner=${'BOTTOM_LEFT'}
        @closed=${
          // Prevent the submenu closing from closing anything upstream (e.g.
          // selecting a submenu in the editor dialog should not close the
          // editor, see https://github.com/dermotduffy/frigate-hass-card/issues/377).
          (ev) => ev.stopPropagation()
        }
        @click=${(ev) => stopEventFromActivatingCardWideActions(ev)}
      >
        <ha-icon-button
          style="${style}"
          slot="trigger"
          .label=${this.submenu.title || ''}
          .actionHandler=${actionHandler({
            // Need to allow event to propagate upwards, as it's caught by the
            // <ha-button-menu> trigger slot to open/close the menu. Further
            // propagation is forbidden by the @click handler on
            // <ha-button-menu>.
            allowPropagation: true,
            hasHold: frigateCardHasAction(this.submenu.hold_action),
            hasDoubleClick: frigateCardHasAction(this.submenu.double_tap_action),
          })}
        >
          <frigate-card-icon
            ?allow-override-non-active-styles=${true}
            style="${style}"
            .hass=${this.hass}
            .icon=${typeof this.submenu.icon === 'string'
              ? {
                  icon: this.submenu.icon,
                }
              : this.submenu.icon}
          ></frigate-card-icon>
        </ha-icon-button>
        ${items.map(this._renderItem.bind(this))}
      </ha-button-menu>
    `;
  }

  static get styles(): CSSResultGroup {
    return unsafeCSS(submenuStyle);
  }
}

@customElement('frigate-card-submenu-select')
export class FrigateCardSubmenuSelect extends LitElement {
  @property({ attribute: false })
  public hass?: HomeAssistant;

  @property({ attribute: false })
  public submenuSelect?: MenuSubmenuSelect;

  @property({ attribute: false })
  public entityRegistryManager?: EntityRegistryManager;

  @state()
  protected _optionTitles?: Record<string, string>;

  protected _generatedSubmenu?: MenuSubmenu;

  /**
   * Called to determine if the update should proceed.
   * @param changedProps
   * @returns `true` if the update should proceed, `false` otherwise.
   */
  protected shouldUpdate(changedProps: PropertyValues): boolean {
    // No need to update the submenu unless the select entity has changed.
    const oldHass = changedProps.get('hass') as HomeAssistant | undefined;
    return (
      !changedProps.has('hass') ||
      !oldHass ||
      !this.submenuSelect ||
      isHassDifferent(this.hass, oldHass, [this.submenuSelect.entity])
    );
  }

  protected async _refreshOptionTitles(): Promise<void> {
    if (!this.hass || !this.submenuSelect) {
      return;
    }
    const entityID = this.submenuSelect.entity;
    const stateObj = this.hass.states[entityID];
    const options = stateObj?.attributes?.options;
    const entity =
      (await this.entityRegistryManager?.getEntity(this.hass, entityID)) ?? null;

    const optionTitles = {};
    for (const option of options) {
      const title = getEntityStateTranslation(this.hass, entityID, {
        ...(entity && { entity: entity }),
        state: option,
      });
      if (title) {
        optionTitles[option] = title;
      }
    }

    // This will cause a re-render with the updated title if it is
    // different.
    this._optionTitles = optionTitles;
  }

  /**
   * Called when the render function will be called.
   */
  protected willUpdate(): void {
    if (!this.submenuSelect || !this.hass) {
      return;
    }

    if (!this._optionTitles) {
      this._refreshOptionTitles();
    }

    const entityID = this.submenuSelect.entity;
    const stateObj = this.hass.states[entityID];
    const options = stateObj?.attributes?.options;
    if (!stateObj || !options) {
      return;
    }

    const title = getEntityTitle(this.hass, entityID);
    const submenu: MenuSubmenu = {
      ...(title && { title }),

      // Override it with anything explicitly set in the submenuSelect.
      ...this.submenuSelect,

      icon: {
        icon: this.submenuSelect.icon,
        entity: entityID,
        fallback: 'mdi:format-list-bulleted',
      },

      type: 'custom:frigate-card-menu-submenu',
      items: [],
    };

    // For cleanliness remove the options parameter which is unused by the
    // submenu rendering itself (above). It is only in this method to populate
    // the items correctly (below).
    delete submenu['options'];

    const items = submenu.items as MenuSubmenuItem[];

    for (const option of options) {
      const title = this._optionTitles?.[option] ?? option;
      items.push({
        state_color: true,
        selected: stateObj.state === option,
        enabled: true,
        title: title || option,
        ...((entityID.startsWith('select.') || entityID.startsWith('input_select.')) && {
          tap_action: {
            action: 'perform-action',
            perform_action: entityID.startsWith('select.')
              ? 'select.select_option'
              : 'input_select.select_option',
            target: {
              entity_id: entityID,
            },
            data: {
              option: option,
            },
          },
        }),
        // Apply overrides the user may have specified for a given option.
        ...(this.submenuSelect.options && this.submenuSelect.options[option]),
      });
    }

    this._generatedSubmenu = submenu;
  }

  protected render(): TemplateResult {
    return html` <frigate-card-submenu
      .hass=${this.hass}
      .submenu=${this._generatedSubmenu}
    ></frigate-card-submenu>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'frigate-card-submenu': FrigateCardSubmenu;
    'frigate-card-submenu-select': FrigateCardSubmenuSelect;
  }
}
