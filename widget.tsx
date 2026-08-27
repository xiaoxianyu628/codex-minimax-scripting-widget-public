import { HStack, ProgressView, Spacer, Text, VStack, Widget } from "scripting"

const HUB = "https://token-monitor-hub.xiaoxianyu628.workers.dev"

type QuotaWindowData = {
  label: string
  remaining: number
  used: number
  resetText: string
}

type ProviderWidgetData = {
  name: string
  color: string
  session: QuotaWindowData
  weekly: QuotaWindowData
}

type WidgetData = {
  codex: ProviderWidgetData
  minimax: ProviderWidgetData
}

function clampPercent(value: unknown): number {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  return Math.max(0, Math.min(100, Math.round(number)))
}

function formatReset(value: unknown): string {
  if (!value) return "重置未知"
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return "重置未知"

  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = String(date.getHours()).padStart(2, "0")
  const minute = String(date.getMinutes()).padStart(2, "0")
  return `${month}/${day} ${hour}:${minute}`
}

function formatResetCountdown(value: unknown): string {
  if (!value) return "重置未知"
  const resetAt = new Date(String(value)).getTime()
  if (!Number.isFinite(resetAt)) return "重置未知"

  const remainingMinutes = Math.ceil((resetAt - Date.now()) / 60000)
  if (remainingMinutes <= 0) return "即将重置"
  if (remainingMinutes < 60) return `${remainingMinutes}m`
  return `${Math.ceil(remainingMinutes / 60)}h`
}

function formatWeeklyCountdown(value: unknown): string {
  if (!value) return "重置未知"
  const resetAt = new Date(String(value)).getTime()
  if (!Number.isFinite(resetAt)) return "重置未知"

  const remainingMinutes = Math.ceil((resetAt - Date.now()) / 60000)
  if (remainingMinutes <= 0) return "即将重置"

  const totalHours = Math.ceil(remainingMinutes / 60)
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  return `${days}日${hours}时`
}

function meterColor(remaining: number, healthyColor: string): string {
  return remaining > 50 ? healthyColor : remaining > 20 ? "#FFD166" : "#FF6B7A"
}

function QuotaWindowRow({ data, color }: { data: QuotaWindowData; color: string }) {
  return (
    <VStack alignment="leading" spacing={2} frame={{ maxWidth: "infinity" }}>
      <HStack frame={{ maxWidth: "infinity" }}>
        <Text font={9} foregroundStyle="#8995AD">
          {data.label}
        </Text>
        <Spacer />
        <Text font={11} fontWeight="bold" monospacedDigit foregroundStyle="white">
          {data.remaining}%
        </Text>
      </HStack>
      <ProgressView
        value={data.remaining}
        total={100}
        progressViewStyle="linear"
        tint={meterColor(data.remaining, color)}
      />
    </VStack>
  )
}

function ProviderBlock({ data }: { data: ProviderWidgetData }) {
  return (
    <VStack alignment="leading" spacing={3} frame={{ maxWidth: "infinity" }}>
      <Text font={10} fontWeight="semibold" foregroundStyle={data.color} kerning={0.5}>
        {data.name}
      </Text>
      <QuotaWindowRow data={data.session} color={data.color} />
      <QuotaWindowRow data={data.weekly} color={data.color} />
    </VStack>
  )
}

function QuotaWidget({ codex, minimax }: WidgetData) {
  return (
    <VStack
      alignment="leading"
      spacing={6}
      padding={12}
      frame={{ maxWidth: "infinity", maxHeight: "infinity" }}
      widgetBackground={{
        gradient: [
          { color: "#18233D", location: 0 },
          { color: "#0B1020", location: 1 },
        ],
        startPoint: { x: 0, y: 0 },
        endPoint: { x: 1, y: 1 },
      }}
    >
      <HStack frame={{ maxWidth: "infinity" }}>
        <Text
          font={12}
          fontWeight="semibold"
          foregroundStyle="#AFC6FF"
          kerning={1.2}
        >
          AI QUOTA
        </Text>
        <Spacer />
        <Text font={10} foregroundStyle="#62E6B3">● LIVE</Text>
      </HStack>

      <ProviderBlock data={codex} />
      <ProviderBlock data={minimax} />
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
      widgetBackground="#0B1020"
    >
      <Text font={12} fontWeight="semibold" foregroundStyle="#AFC6FF">
        AI QUOTA
      </Text>
      <Spacer />
      <Text font={16} fontWeight="bold" foregroundStyle="white">
        暂无额度数据
      </Text>
      <Text font={10} foregroundStyle="#8995AD" lineLimit={3}>
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
    const provider = (id: string) => providers.find(
      (item: any) => item?.provider === id && item?.status === "ok"
    )
    const providerData = (id: string, name: string, color: string): ProviderWidgetData => {
      const item = provider(id)
      const windows = Array.isArray(item?.windows) ? item.windows : []
      const weekly = windows.find((window: any) => window?.kind === "weekly")
      const session = windows.find((window: any) => window?.kind === "session")
      if (!weekly) throw new Error(`服务器尚未同步 ${name} 周额度`)
      if (!session) throw new Error(`服务器尚未同步 ${name} 5h 额度`)
      return {
        name,
        color,
        session: {
          label: formatResetCountdown(session.resetsAt),
          remaining: clampPercent(session.remainingPercent),
          used: clampPercent(session.usedPercent),
          resetText: formatReset(session.resetsAt),
        },
        weekly: {
          label: formatWeeklyCountdown(weekly.resetsAt),
          remaining: clampPercent(weekly.remainingPercent),
          used: clampPercent(weekly.usedPercent),
          resetText: formatReset(weekly.resetsAt),
        },
      }
    }

    Widget.present(
      <QuotaWidget
        codex={providerData("codex", "CODEX", "#AFC6FF")}
        minimax={providerData("minimax", "MINIMAX", "#FF718A")}
      />
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    Widget.present(<ErrorWidget message={message} />)
  }
}

run()
