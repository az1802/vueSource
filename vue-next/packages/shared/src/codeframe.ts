const range: number = 2 //同来控制提示代码错误的代码片段显示的范围

/**
 * 当编译出错时可以用来提示字符串中哪里出现了错误
 * @param source 源码字符串
 * @param start 开始地址
 * @param end 结束地址
 */
export function generateCodeFrame(
  source: string,
  start = 0,
  end = source.length
): string {
  const lines = source.split(/\r?\n/)
  let count = 0
  const res: string[] = []
  for (let i = 0; i < lines.length; i++) {
    count += lines[i].length + 1
    if (count >= start) {
      // 控制显示错误提示范围(最多显示5行)
      for (let j = i - range; j <= i + range || end > count; j++) {
        if (j < 0 || j >= lines.length) continue
        const line = j + 1
        res.push(`${line}${' '.repeat(3 - String(line).length)}|  ${lines[j]}`)
        const lineLength = lines[j].length
        if (j === i) {
          // push underline
          const pad = start - (count - lineLength) + 1
          const length = Math.max(
            1,
            end > count ? lineLength - pad : end - start
          )
          res.push(`   |  ` + ' '.repeat(pad) + '^'.repeat(length))
        } else if (j > i) {
          if (end > count) {
            const length = Math.max(Math.min(end - count, lineLength), 1)
            res.push(`   |  ` + '^'.repeat(length))
          }
          count += lineLength + 1
        }
      }
      break
    }
  }
  return res.join('\n')
}
