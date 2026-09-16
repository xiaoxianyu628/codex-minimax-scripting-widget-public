import { HStack, ProgressView, Spacer, Text, VStack, Widget } from "scripting"

const HUB = "https://token-monitor-hub.xiaoxianyu628.workers.dev"

type QuotaWindowData = {
  remaining: number
}

type ProviderWidgetData = {
  name: string
  short: string
  color: string
  session: QuotaWindowData
  weekly: QuotaWindowData
}

type DeepSeekWidgetData = {
  amount: string
  today: string
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
  return remaining > 50 ? healthyColor : remaining > 20 ? "#FFD166" : "#FF6B7A"
}

const CURRENCY_SYMBOLS: Record<string, string> = { CNY: "¥", USD: "$", EUR: "€" }

function formatMoney(value: unknown, currency: unknown): string {
  const number = Number(value)
  if (!Number.isFinite(number)) return "--"
  const code = String(currency || "CNY").toUpperCase()
  const symbol = CURRENCY_SYMBOLS[code]
  return symbol ? `${symbol}${number.toFixed(2)}` : `${number.toFixed(2)} ${code}`
}

function AccountRow({ data }: { data: ProviderWidgetData }) {
  return (
    <HStack spacing={5} frame={{ maxWidth: "infinity" }}>
      <Text font={10} fontWeight="bold" foregroundStyle={data.color} kerning={0.5}>
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
      <Text font={10} fontWeight="bold" monospacedDigit foregroundStyle="white">
        {data.session.remaining}%
      </Text>
      <Text font={9} monospacedDigit foregroundStyle="#8995AD">
        周{data.weekly.remaining}%
      </Text>
    </HStack>
  )
}

function DeepSeekRow({ data }: { data: DeepSeekWidgetData }) {
  return (
    <HStack spacing={5} frame={{ maxWidth: "infinity" }}>
      <Text font={10} fontWeight="bold" foregroundStyle="#FFC46B" kerning={0.5}>
        DS
      </Text>
      <Spacer />
      {data.ok ? (
        <Text font={9} monospacedDigit foregroundStyle="#8995AD">
          今日 {data.today}
        </Text>
      ) : null}
      <Text font={11} fontWeight="bold" monospacedDigit foregroundStyle="white">
        {data.ok ? data.amount : "--"}
      </Text>
    </HStack>
  )
}

function QuotaWidget({ codexA, codexB, deepseek }: WidgetData) {
  return (
    <VStack
      alignment="leading"
      spacing={7}
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
        <Text font={11} fontWeight="semibold" foregroundStyle="#AFC6FF" kerning={1.2}>
          AI QUOTA
        </Text>
        <Spacer />
        <Text font={9} foregroundStyle="#62E6B3">● LIVE</Text>
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
    const accounts = providers.filter(
      (item: any) => item?.provider === "codex" && item?.status === "ok"
    )
    const account = (slot: string, fallbackIndex: number) => accounts.find((item: any) =>
      String(item?.accountSlot || "").toUpperCase().includes(slot)
    ) || accounts[fallbackIndex]
    const providerData = (item: any, name: string, short: string, color: string): ProviderWidgetData => {
      const windows = Array.isArray(item?.windows) ? item.windows : []
      const weekly = windows.find((window: any) => window?.kind === "weekly")
      const session = windows.find((window: any) => window?.kind === "session")
      if (!weekly) throw new Error(`服务器尚未同步 ${name} 周额度`)
      if (!session) throw new Error(`服务器尚未同步 ${name} 5h 额度`)
      return {
        name,
        short,
        color,
        session: { remaining: clampPercent(session.remainingPercent) },
        weekly: { remaining: clampPercent(weekly.remainingPercent) },
      }
    }

    const deepseekEntry = providers.find((item: any) => item?.provider === "deepseek")
    const deepseekBalance = deepseekEntry?.balance || {}
    const deepseek: DeepSeekWidgetData = {
      ok: deepseekEntry?.status === "ok",
      amount: formatMoney(deepseekBalance.amount, deepseekBalance.currency),
      today: formatMoney(deepseekBalance.todaySpend, deepseekBalance.currency),
    }

    Widget.present(
      <QuotaWidget
        codexA={providerData(account("A", 0), "CODEX A", "A", "#AFC6FF")}
        codexB={providerData(account("B", 1), "CODEX B", "B", "#62E6B3")}
        deepseek={deepseek}
      />
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    Widget.present(<ErrorWidget message={message} />)
  }
}

run()
