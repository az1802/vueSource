


## patch
各种方法逻辑
patch 入口对比两个vnode节点针对不同类型的节点采用不同的process方法\

根据type大致处理
text -->  processText
comment --> processCommentNode
static --> mountStaticNode || patchStaticNode
Fragment --> processFragment
根据ShapeFlags处理
Element --> processElement 
Component --> processComponent 
TELEPORT --> TeleportImpl.process
SUSPENSE --> SuspenseImpl.process





processElement --> mountElement(创建dom节点,文本节点快速处理  mountChildren处理子节点) | patchElement
processComponent --> mountComponent(内部createComponentInstance创建实例对象然后使用setupComponent(instance)完成初始化  通过effect 完成组件的init render patch mount 过程然后组件的dom节点和父dom节点关联) | updateComponent(shouldUpdateComponent内部优化看是否可以跳过组件更新)



mountChildren 绑定子节点  (每个子节点递归调用patch方法) 
patchChildren  子节点进行更新  child vnode
存在patchFlag表示可以进行快速更新
KEYED_FRAGMENT --> patchKeyedChildren  
UNKEYED_FRAGMENT --> patchUnkeyedChildren


TEXT_CHILDREN --> prev childen 存在unmountChildren 否者直接使用hostSetElementText 更新文本内容
prev 为数组  ARRAY_CHILDREN --> new chilren存在使用patchKeyedChildren  否则 unmountChildren解绑旧节点

prev null或者text new 为array  null  对prev使用hostSetElementText设置文本为""  对new mountChildren

属性方面的更新
patchProps   全量的对比属性进行更新  内部会调用hostPatchProp对每个属性进行更新
hostPatchProp 跟平台相关的更新属性的方法  传入不同的key即处理不同的属性部分  (style class会特殊处理)
