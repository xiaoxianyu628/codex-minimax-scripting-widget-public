# AI 额度直连组件

这是给 iPhone Scripting 使用的公开直连版小组件。它只读取服务器脱敏后的额度数据，不包含账号、OAuth Token、API Key 或其他凭据。

## 远程导入

使用固定链接：

`https://github.com/xiaoxianyu628/codex-minimax-scripting-widget-public/raw/refs/heads/main/AI额度直连版-v7.zip`

## 显示内容

- 每个 Codex 账号一行：账号标记、5 小时剩余额度进度条、百分比、周剩余额度
- 底部一行 DeepSeek：仅显示可用余额
- 紧凑单行布局，避免小尺寸小组件下标签被挤压截断
- MiniMax 已从该组件移除

`AI额度直连版-v7.zip` 是手机远程导入使用的正式包；仓库根目录的 `index.tsx` 与 `script.json` 与包内版本保持一致。
