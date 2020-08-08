import { setDevtoolsHook } from '@vue/runtime-dom'
import { getGlobalThis } from '@vue/shared'

// 初始化dev环境的提示信息
export function initDev() {
  const target = getGlobalThis()

  target.__VUE__ = true
  setDevtoolsHook(target.__VUE_DEVTOOLS_GLOBAL_HOOK__)

  if (__BROWSER__) {
    console.info(
      `You are running a development build of Vue.\n` +
        `Make sure to use the production build (*.prod.js) when deploying for production.`
    )
  }
}
