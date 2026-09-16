import { HStack, ProgressView, Spacer, Text, VStack, Widget } from "scripting"

const HUB = "https://token-monitor-hub.xiaoxianyu628.workers.dev"

type QuotaWindowData = {
  remaining: number
  resetText: string
}

type ProviderWidgetData = {
  short: string
  color: string
  session: QuotaWindowData
  weekly: QuotaWindowData
}

type DeepSeekWidgetData = {
  amount: string
  ok: boolean
}

type WidgetData = {
  codexA: ProviderWidgetData
  codexB: ProviderWidgetData
  deepseek: DeepSeekWidgetData
}

function clampPercent(value: unknown): number {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  return Math.max(0, Math.min(100, Math.round(number)))
}

function meterColor(remaining: number, healthyColor: string): string {
  if (remaining <= 20) return "#FF6B7A"
  if (remaining <= 50) return "#FFC46B"
  return healthyColor
}

function formatMoney(value: unknown, currency: unknown): string {
  const number = Number(value)
  if (!Number.isFinite(number)) return "--"
  const code = String(currency || "CNY").toUpperCase()
  const symbol = code === "CNY" ? "¥" : code === "USD" ? "$" : code === "EUR" ? "€" : ""
  return symbol ? `${symbol}${number.toFixed(2)}` : `${number.toFixed(2)} ${code}`
}

// 5 小时窗口重置倒计时
function formatSessionReset(value: unknown): string {
  if (!value) return "--"
  const resetAt = new Date(String(value)).getTime()
  if (!Number.isFinite(resetAt)) return "--"
  const minutes = Math.ceil((resetAt - Date.now()) / 60000)
  if (minutes <= 0) return "即将重置"
  if (minutes < 60) return `${minutes}分`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest > 0 ? `${hours}时${rest}分` : `${hours}时`
}

// 周窗口重置倒计时
function formatWeeklyReset(value: unknown): string {
  if (!value) return "--"
  const resetAt = new Date(String(value)).getTime()
  if (!Number.isFinite(resetAt)) return "--"
  const minutes = Math.ceil((resetAt - Date.now()) / 60000)
  if (minutes <= 0) return "即将重置"
  const totalHours = Math.ceil(minutes / 60)
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  if (days <= 0) return `${hours}时`
  return hours > 0 ? `${days}天${hours}时` : `${days}天`
}

function AccountRow({ data }: { data: ProviderWidgetData }) {
  return (
    <VStack alignment="leading" spacing={4} frame={{ maxWidth: "infinity" }}>
      <HStack spacing={8} frame={{ maxWidth: "infinity" }}>
        <Text font={13} fontWeight="bold" foregroundStyle={data.color} kerning={0.5}>
          {data.short}
        </Text>
        <HStack frame={{ maxWidth: "infinity" }}>
          <ProgressView
            value={data.session.remaining}
            total={100}
            progressViewStyle="linear"
            tint={meterColor(data.session.remaining, data.color)}
          />
        </HStack>
        <Text font={13} fontWeight="bold" monospacedDigit foregroundStyle="white">
          {data.session.remaining}%
        </Text>
        <Text font={10} monospacedDigit foregroundStyle="#6E7681">
          周{data.weekly.remaining}%
        </Text>
      </HStack>
      <HStack frame={{ maxWidth: "infinity" }}>
        <Text font={10} monospacedDigit foregroundStyle="#6E7681">
          {data.session.resetText}
        </Text>
        <Spacer />
        <Text font={10} monospacedDigit foregroundStyle="#6E7681">
          {"周 "}{data.weekly.resetText}
        </Text>
      </HStack>
    </VStack>
  )
}

function DeepSeekRow({ data }: { data: DeepSeekWidgetData }) {
  return (
    <HStack frame={{ maxWidth: "infinity" }}>
      <Text font={13} fontWeight="bold" foregroundStyle="#FFB454" kerning={0.5}>
        DS
      </Text>
      <Spacer />
      <Text font={13} fontWeight="bold" monospacedDigit foregroundStyle="white">
        {data.ok ? data.amount : "--"}
      </Text>
    </HStack>
  )
}

function QuotaWidget({ codexA, codexB, deepseek }: WidgetData) {
  return (
    <VStack
      alignment="leading"
      spacing={11}
      padding={13}
      frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
      widgetBackground={{
        gradient: [
          { color: "#1C1F26", location: 0 },
          { color: "#0A0C10", location: 1 },
        ],
        startPoint: { x: 0, y: 0 },
        endPoint: { x: 1, y: 1 },
      }}
    >
      <HStack frame={{ maxWidth: "infinity" }}>
        <Text font={11} fontWeight="semibold" foregroundStyle="#C9D1D9" kerning={1.5}>
          AI QUOTA
        </Text>
        <Spacer />
        <Text font={9} foregroundStyle="#3DDC97">● LIVE</Text>
      </HStack>

      <AccountRow data={codexA} />
      <AccountRow data={codexB} />
      <DeepSeekRow data={deepseek} />
    </VStack>
  )
}

function ErrorWidget({ message }: { message: string }) {
  return (
    <VStack
      alignment="leading"
      spacing={8}
      padding={16}
      frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
      widgetBackground="#0A0C10"
    >
      <Text font={12} fontWeight="semibold" foregroundStyle="#C9D1D9">
        AI QUOTA
      </Text>
      <Spacer />
      <Text font={16} fontWeight="bold" foregroundStyle="white">
        暂无额度数据
      </Text>
      <Text font={10} foregroundStyle="#6E7681" lineLimit={3}>
        {message}
      </Text>
    </VStack>
  )
}

async function run() {
  try {
    const url = `${HUB}/api/public/stats`
    const response = await fetch(url, { timeout: 15 })
    if (!response.ok) throw new Error(`额度服务器返回 HTTP ${response.status}`)
    const data = await response.json()
    const providers = Array.isArray(data?.limits?.providers)
      ? data.limits.providers
      : []
    const accounts = providers.filter(
      (item: any) => item?.provider === "codex" && item?.status === "ok"
    )
    const account = (slot: string, fallbackIndex: number) => accounts.find((item: any) =>
      String(item?.accountSlot || "").toUpperCase().includes(slot)
    ) || accounts[fallbackIndex]
    const providerData = (item: any, short: string, color: string): ProviderWidgetData => {
      const windows = Array.isArray(item?.windows) ? item.windows : []
      const weekly = windows.find((window: any) => window?.kind === "weekly")
      const session = windows.find((window: any) => window?.kind === "session")
      if (!weekly) throw new Error(`服务器尚未同步 ${short} 周额度`)
      if (!session) throw new Error(`服务器尚未同步 ${short} 5h 额度`)
      return {
        short,
        color,
        session: {
          remaining: clampPercent(session.remainingPercent),
          resetText: formatSessionReset(session.resetsAt),
        },
        weekly: {
          remaining: clampPercent(weekly.remainingPercent),
          resetText: formatWeeklyReset(weekly.resetsAt),
        },
      }
    }

    const deepseekEntry = providers.find((item: any) => item?.provider === "deepseek")
    const deepseekBalance = deepseekEntry?.balance || {}
    const deepseek: DeepSeekWidgetData = {
      ok: deepseekEntry?.status === "ok",
      amount: formatMoney(deepseekBalance.amount, deepseekBalance.currency),
    }

    Widget.present(
      <QuotaWidget
        codexA={providerData(account("A", 0), "A", "#5B9BFF")}
        codexB={providerData(account("B", 1), "B", "#3DDC97")}
        deepseek={deepseek}
      />
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    Widget.present(<ErrorWidget message={message} />)
  }
}

run()
