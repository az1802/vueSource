# Vue功能点源码解析

### createApp
source : src/apiCreateApp.ts
使用createAppAPI创建createApp函数。createApp函数返回一个对象(包含use,mount,unmount等方法)。
采用createApp方法创建时options参数不会进行任何处理。只有当执行mount的时候才会去处理options参数。
vue2中只要执行了new Vue() 就回立马执行options的处理以及mount过程。

### mount过程
mount
    createVNode(Component,rootProps)    创建根组件的vnode节点.此时只是简单将组件参数放入到vnode的的type中(不会处理组件参数和数据响应式)
    render(vnode, rootContainer)       render函数完成vnode节点到DOM节点的转换及添加到容器中
         patch(container._vnode || null, vnode, container);  patch函数完成vnode节点到dom节点的转换

## patch
patch对比新旧vnode节点进行更新。
1 新旧vnode节点type不一样时,则卸载旧的vnode节点创建新的vnode节点,会触发相关组件的卸载和创建钩子函数
    新旧不一致unmount方法
       1 解除ref的相关引用  2 keep-alive则触发deactivate钩子函数  3 组件通过unmountComponent方法,普通元素存在指令则会执行指令相关的钩子函数
2 新旧vnode一样时进行对比更新
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
processComponent --> mountComponent(内部createComponentInstance创建实例对象,然后使用setupComponent(instance)完成初始化  通过effect 完成组件的init render patch mount 过程然后组件的dom节点和父dom节点关联  setupRenderEffect) | updateComponent(shouldUpdateComponent内部优化看是否可以跳过组件更新)


mountComponent
    创建组件实例对象
    setupComponent(执行setup函数同时完成template转换为render函数以及组件options的处理)
        initProps(处理组件属性部分)
        initSlots(处理组件的插槽部分)
        setupStatefulComponent(执行setup)
            handleSetupResult(根据setup函数返回值进行不同处理,函数则赋值render,对象则作为数据挂载到实例上)
                finishComponentSetup(这里会执行compile将template字符串转换为render函数,同时处理options)
                    compile(template字符串转换为render函数)
                    applyOptions(处理组件options参数,触发beforeCreate,created钩子函数)
    setupRenderEffect(通过effect,运行render函数完成依赖收集)
        renderComponentRoot(执行render函数生成组件vnode树)
        patch(对比新旧vnode完成到dom树的转换)
mountChildren 绑定子节点  (每个子节点递归调用patch方法) 
patchChildren  子节点进行更新  child vnode
存在patchFlag表示可以进行快速更新
KEYED_FRAGMENT --> patchKeyedChildren  
UNKEYED_FRAGMENT --> patchUnkeyedChildren



##### 钩子函数触发时间点
beforeCreate,created                               applyOptions中执行
beforeMount,mounted,beforeUpdate,updated           componentEffect中执行


##### reactive逻辑原理

##### 原生的属性 新增了vnode的钩子函数
ref key
  'onVnodeBeforeMount,onVnodeMounted,' +
    'onVnodeBeforeUpdate,onVnodeUpdated,' +
    'onVnodeBeforeUnmount,onVnodeUnmounted'

##### slot插槽相关的逻辑
src/helpers/componentSlots
initSlots

TEXT_CHILDREN --> prev childen 存在unmountChildren 否者直接使用hostSetElementText 更新文本内容
prev 为数组  ARRAY_CHILDREN --> new chilren存在使用patchKeyedChildren  否则 unmountChildren解绑旧节点

prev null或者text new 为array  null  对prev使用hostSetElementText设置文本为""  对new mountChildren

属性方面的更新
patchProps   全量的对比属性进行更新  内部会调用hostPatchProp对每个属性进行更新
hostPatchProp 跟平台相关的更新属性的方法  传入不同的key即处理不同的属性部分  (style class会特殊处理)
