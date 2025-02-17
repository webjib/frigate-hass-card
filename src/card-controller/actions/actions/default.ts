import { GeneralActionConfig } from '../../../config/types';
import { CardActionsAPI } from '../../types';
import { FrigateCardAction } from './base';

export class DefaultAction extends FrigateCardAction<GeneralActionConfig> {
  public async execute(api: CardActionsAPI): Promise<void> {
    await api.getViewManager().setViewDefaultWithNewQuery();
  }
}
