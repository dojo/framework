import { v } from '../../../../src/widget-core/d';
import WidgetBase from '../../../../src/widget-core/WidgetBase';
import Projector from '../../../../src/widget-core/mixins/Projector';
import Drag from '../../../../src/widget-core/meta/Drag';

class DragExample extends WidgetBase {
	render() {
		const dragResults = this.meta(Drag).get('root');
		return v(
			'div',
			{
				key: 'root',
				styles: {
					'background-color': dragResults.isDragging ? 'green' : 'white',
					border: '1px solid black',
					color: dragResults.isDragging ? 'white' : 'black',
					height: '400px',
					'user-select': 'none',
					width: '200px'
				}
			},
			[v('pre', { id: 'results' }, [JSON.stringify(dragResults, null, '  ')])]
		);
	}
}

const projector = new (Projector(DragExample))();

projector.append();
