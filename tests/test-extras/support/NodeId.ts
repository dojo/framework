import Base from '@dojo/widget-core/meta/Base';

export default class NodeId extends Base {
	get(key: string | number) {
		const node = this.getNode(key);
		if (node) {
			return node.id;
		}
	}
}
