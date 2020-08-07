/* @flow */

let decoder

/**
 * 将文本字符换填入到html标签并进行返回即进行译码处理
 */
export default {
  decode (html: string): string {
    decoder = decoder || document.createElement('div')
    decoder.innerHTML = html
    return decoder.textContent
  }
}
