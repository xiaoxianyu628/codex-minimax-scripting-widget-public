import {
  Button,
  HStack,
  Keychain,
  Navigation,
  NavigationStack,
  Script,
  SecureField,
  Spacer,
  Text,
  VStack,
  Widget,
  useMemo,
  useState,
} from "scripting"

import {
  ProviderUsageState,
  QuotaUsageActivity,
  QuotaUsageState,
} from "./live_activity"
import { HUB, SECRET_KEY, readSecret } from "./widget"

function clampPercent(value: unknown): number | null {
  const number = Number(value)
  if (!Number.isFinite(number)) return null
  return Math.max(0, Math.min(100, Math.round(number)))
}

function parseResetAt(value: unknown): number | null {
  if (!value) return null
  const timestamp = new Date(String(value)).getTime()
  return Number.isFinite(timestamp) ? timestamp : null
}

function chooseWindow(windows: any[], kind: string): any | null {
  return windows.find((item) => String(item?.kind || "").toLowerCase() === kind) || null
}

function readProviderUsage(provider: any, name: string): ProviderUsageState {
  if (!provider) throw new Error(`服务器尚未同步 ${name} 额度`)
  if (provider.status !== "ok") throw new Error(`${name} 额度状态：${provider.status || "未知"}`)
  if (provider.stale === true) throw new Error(`${name} 额度数据已过期，请稍后再试`)

  const windows = Array.isArray(provider.windows) ? provider.windows : []
  const weekly = chooseWindow(windows, "weekly")
  const session = chooseWindow(windows, "session")
  const weeklyRemaining = clampPercent(weekly?.remainingPercent)
  const weeklyUsed = clampPercent(weekly?.usedPercent)
  const sessionRemaining = clampPercent(session?.remainingPercent)
  const sessionUsed = clampPercent(session?.usedPercent)
  if (weeklyRemaining == null || weeklyUsed == null || sessionRemaining == null || sessionUsed == null) {
    throw new Error(`服务器返回的 ${name} 5h/周额度字段不完整`)
  }

  return {
    weeklyRemaining,
    weeklyUsed,
    sessionRemaining,
    sessionUsed,
    weeklyResetAtMs: parseResetAt(weekly?.resetsAt),
    sessionResetAtMs: parseResetAt(session?.resetsAt),
  }
}

async function readQuotaUsage(): Promise<QuotaUsageState> {
  const secret = readSecret()
  if (!secret) throw new Error("请先保存访问密钥")
  const url = `${HUB}/api/stats?secret=${encodeURIComponent(secret)}`
  const response = await fetch(url, { timeout: 15 })
  if (!response.ok) throw new Error(`额度服务器返回 HTTP ${response.status}`)

  const data: any = await response.json()
  const providers = Array.isArray(data?.limits?.providers) ? data.limits.providers : []
  const codex = providers.find((item: any) => item?.provider === "codex" && item?.status === "ok")
    || providers.find((item: any) => item?.provider === "codex")
  const minimax = providers.find((item: any) => item?.provider === "minimax" && item?.status === "ok")
    || providers.find((item: any) => item?.provider === "minimax")

  return {
    codex: readProviderUsage(codex, "Codex"),
    minimax: readProviderUsage(minimax, "MiniMax"),
    fetchedAtMs: Date.now(),
    stale: false,
    error: null,
  }
}

function emptyProvider(): ProviderUsageState {
  return {
    weeklyRemaining: 0,
    weeklyUsed: 100,
    sessionRemaining: null,
    sessionUsed: null,
    weeklyResetAtMs: null,
    sessionResetAtMs: null,
  }
}

function emptyState(): QuotaUsageState {
  return {
    codex: emptyProvider(),
    minimax: emptyProvider(),
    fetchedAtMs: Date.now(),
    stale: true,
    error: "暂无最新数据",
  }
}

function ControlPanel() {
  const dismiss = Navigation.useDismiss()
  const [message, setMessage] = useState(
    readSecret() ? "点击刷新并启动灵动岛" : "首次使用：请先填写并保存访问密钥"
  )
  const [secret, setSecret] = useState(readSecret())
  const [latest, setLatest] = useState<QuotaUsageState | null>(null)
  const [activityState, setActivityState] = useState("未启动")
  const activity = useMemo(() => QuotaUsageActivity(), [])

  const saveSecret = () => {
    const next = secret.trim()
    if (!next) {
      setMessage("访问密钥不能为空")
      return
    }
    if (!Keychain.set(SECRET_KEY, next)) {
      setMessage("访问密钥保存失败")
      return
    }
    setSecret(next)
    setMessage("访问密钥已安全保存，可以刷新额度")
  }

  const refresh = async () => {
    setMessage("正在读取 Codex 与 MiniMax 额度…")
    try {
      const next = await readQuotaUsage()
      setLatest(next)

      const current = await activity.getActivityState()
      const options = {
        staleDate: Date.now() + 30 * 60 * 1000,
        relevanceScore: 0.8,
      }
      const started = current === "active" || current === "stale"
        ? (await activity.update(next, options), true)
        : await activity.start(next, options)
      if (!started) throw new Error("iPhone 没有允许 Live Activity")

      setActivityState("运行中")
      setMessage(`已更新：Codex 5h ${next.codex.sessionRemaining}% · MiniMax 5h ${next.minimax.sessionRemaining}%`)
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error)
      setMessage(`失败：${text}`)
    }
  }

  const end = async () => {
    try {
      await activity.end(latest || emptyState(), { dismissTimeInterval: 0 })
      setActivityState("已结束")
      setMessage("灵动岛已结束")
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error)
      setMessage(`结束失败：${text}`)
    }
  }

  return (
    <NavigationStack>
      <VStack
        alignment="leading"
        spacing={12}
        padding={18}
        navigationTitle="AI 套餐额度"
        navigationBarTitleDisplayMode="inline"
        toolbar={{
          cancellationAction: <Button title="完成" action={dismiss} />,
        }}
      >
        <HStack>
          <Text font={18} fontWeight="bold">AI QUOTA</Text>
          <Spacer />
          <Text foregroundStyle="#62E6B3">{activityState}</Text>
        </HStack>
        <Text foregroundStyle="#8995AD" lineLimit={3}>{message}</Text>
        <SecureField
          title="访问密钥"
          value={secret}
          onChanged={setSecret}
          prompt="首次使用时填写一次"
        />
        <Button title="保存访问密钥" action={saveSecret} />
        {latest ? (
          <VStack alignment="leading" spacing={4}>
            <Text font={18} fontWeight="bold" foregroundStyle="#AFC6FF">CODEX</Text>
            <Text monospacedDigit>5 小时剩余 {latest.codex.sessionRemaining}% · 已用 {latest.codex.sessionUsed}%</Text>
            <Text monospacedDigit>一周剩余 {latest.codex.weeklyRemaining}% · 已用 {latest.codex.weeklyUsed}%</Text>
            <Text font={18} fontWeight="bold" foregroundStyle="#FF718A">MINIMAX</Text>
            <Text monospacedDigit>5 小时剩余 {latest.minimax.sessionRemaining}% · 已用 {latest.minimax.sessionUsed}%</Text>
            <Text monospacedDigit>一周剩余 {latest.minimax.weeklyRemaining}% · 已用 {latest.minimax.weeklyUsed}%</Text>
          </VStack>
        ) : null}
        <Button title="刷新并启动 / 更新灵动岛" action={() => { void refresh() }} />
        <Button title="预览桌面小组件" action={() => { void Widget.preview({ family: "systemSmall" }) }} />
        <Button title="结束灵动岛" action={() => { void end() }} />
      </VStack>
    </NavigationStack>
  )
}

async function run() {
  await Navigation.present(<ControlPanel />)
  Script.exit()
}

run()
