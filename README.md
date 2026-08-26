# Codex + MiniMax 额度 Scripting 版

这张 Scripting 脚本卡片包含三个代码文件和一个项目清单：

```text
Codex额度
├── index.tsx          # 控制页：读取额度、启动/更新/结束灵动岛
├── widget.tsx         # 桌面小组件
├── live_activity.tsx  # Dynamic Island / 锁屏 Live Activity UI
└── script.json        # Scripting 远程导入所需的项目清单
```

数据来源仍然是 Token Monitor 的 Cloudflare Worker。服务端会同时采集 Codex
和 MiniMax Token Plan 的额度。访问密钥不会写入公开代码，而是保存在 iPhone
系统钥匙串中。

## 手机端操作

1. 在 Scripting 中选择“导入远程脚本”，粘贴本仓库地址。
2. 导入后打开脚本，填写一次“访问密钥”并保存。
3. 在 iPhone 设置中允许 Scripting 的“实时活动”。
4. 点击“刷新并启动 / 更新灵动岛”。
5. 以后仍从同一 GitHub 地址更新，钥匙串中的密钥无需重新填写。

## 显示内容

- 桌面小组件：Codex 与 MiniMax 都各自显示两条独立额度：5 小时和一周。
- 紧凑灵动岛：左右分别显示 Codex 与 MiniMax 的 5 小时剩余。
- 展开灵动岛：Codex 与 MiniMax 都同时显示 5 小时和一周额度。
- 锁屏：显示同一份双套餐额度摘要。

Live Activity 扩展本身不负责联网；联网和鉴权发生在 `index.tsx`，再把纯数字状态
传给 Live Activity。这也是为什么需要点击刷新，而不是把 ChatGPT 登录令牌放在手机上。

## 更新频率

点击刷新时会重新读取服务器。iOS 可能暂停后台脚本，因此这是“手动刷新 + 保留最后状态”
的版本；要做自动刷新，可以再接 Scripting 的快捷指令自动化。

## 2026-08-26 更新

- Codex 与 MiniMax 统一改为“5 小时 + 一周”双周期显示。
- 两个周期均为独立额度，不再把周额度压缩成副文本。
