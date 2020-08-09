import { NodeTransform } from '../transform'
import { findDir } from '../utils'
import { NodeTypes } from '../ast'
import { SET_BLOCK_TRACKING } from '../runtimeHelpers'

// 对ast节点的v-once指令做处理
export const transformOnce: NodeTransform = (node, context) => {
  if (node.type === NodeTypes.ELEMENT && findDir(node, 'once', true)) {
    context.helper(SET_BLOCK_TRACKING) //添加setBlockTracking,后续函数中需要从vue中导入的辅助方法
    return () => {
      if (node.codegenNode) { //已经被编码处理过了则直接从缓存中获取
        node.codegenNode = context.cache(node.codegenNode, true /* isVNode */)
      }
    }
  }
}
