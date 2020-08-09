import { NodeTransform, NodeTypes, ElementTypes } from '@vue/compiler-core/src'
import { DOMErrorCodes, createDOMCompilerError } from '../errors'

// 忽略script style这些副作用标签并将此ast节点移除
export const ignoreSideEffectTags: NodeTransform = (node, context) => {
  if (
    node.type === NodeTypes.ELEMENT &&
    node.tagType === ElementTypes.ELEMENT &&
    (node.tag === 'script' || node.tag === 'style')
  ) {
    context.onError(
      createDOMCompilerError(DOMErrorCodes.X_IGNORED_SIDE_EFFECT_TAG, node.loc)
    )
    context.removeNode()
  }
}
