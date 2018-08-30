import { WidgetBase } from '@dojo/framework/widget-core/WidgetBase';
import { v, w } from '@dojo/framework/widget-core/d';
import { Prompt } from '@dojo/framework/routing/Prompt';

export class App extends WidgetBase {
	private _inputValue = '';
	private _onInput(event: Event) {
		const target = event.target as HTMLInputElement;
		this._inputValue = target.value;
		this.invalidate();
	}

	protected render() {
		return v('div', [
			v('input', { value: this._inputValue, oninput: this._onInput }),
			w(Prompt, {
				shouldBlock: () => {
					return !!this._inputValue;
				},
				renderer: (options: any) => {
					return v('div', [
						v('button', { type: 'button', onclick: options.continue }, ['Continue']),
						v('button', { type: 'button', onclick: options.block }, ['Block'])
					]);
				}
			})
		]);
	}
}

export const PromptRouteConfig = {
	path: 'prompt',
	outlet: 'prompt'
};
