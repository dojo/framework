import { DNode } from '../../../../src/core/interfaces';
import { WidgetBase } from '../../../../src/core/WidgetBase';
import { v } from '../../../../src/core/vdom';

export interface RowProperties {
	onRowSelected: (id: number) => void;
	onRowDeleted: (id: number) => void;
	selected: boolean;
	label: string;
	id: number;
}

export class Row extends WidgetBase<RowProperties> {
	private _onDelete() {
		const { onRowDeleted, id } = this.properties;
		onRowDeleted(id);
	}

	private _onClick() {
		const { onRowSelected, id } = this.properties;
		onRowSelected(id);
	}

	protected render(): DNode {
		const { id, selected, label } = this.properties;

		return v(
			'tr',
			{
				classes: [selected ? 'danger' : null]
			},
			[
				v('td', { classes: ['col-md-1'] }, [`${id}`]),
				v('td', { classes: ['col-md-4'] }, [v('a', { onclick: this._onClick }, [label])]),
				v('td', { classes: ['col-md-1'] }, [
					v('a', { onclick: this._onDelete }, [
						v('span', {
							'aria-hidden': 'true',
							classes: ['glyphicon', 'glyphicon-remove']
						})
					])
				]),
				v('td', { classes: ['col-md-6'] })
			]
		);
	}
}

export default Row;
