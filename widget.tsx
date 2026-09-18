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

type OpencodeWidgetData = {
  ok: boolean
  session: QuotaWindowData
  weekly: QuotaWindowData
  monthly: QuotaWindowData
}

type WidgetData = {
  codexA: ProviderWidgetData
  codexB: ProviderWidgetData
  opencode: OpencodeWidgetData
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
    <VStack alignment="leading" spacing={3} frame={{ maxWidth: "infinity" }}>
      <HStack spacing={6} frame={{ maxWidth: "infinity" }}>
        <Text font={11} fontWeight="bold" foregroundStyle={data.color} kerning={0.5}>
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
        <Text font={11} fontWeight="bold" monospacedDigit foregroundStyle="white">
          {data.session.remaining}%
        </Text>
      </HStack>
      <HStack spacing={6} frame={{ maxWidth: "infinity" }}>
        <Text font={9} monospacedDigit foregroundStyle="#6E7681">
          {data.session.resetText}
        </Text>
        <Spacer />
        <Text font={9} monospacedDigit foregroundStyle="#6E7681">
          {"周 "}{data.weekly.remaining}%{" · "}{data.weekly.resetText}
        </Text>
      </HStack>
    </VStack>
  )
}

function OpencodeRow({ data }: { data: OpencodeWidgetData }) {
  return (
    <VStack alignment="leading" spacing={3} frame={{ maxWidth: "infinity" }}>
      <HStack spacing={6} frame={{ maxWidth: "infinity" }}>
        <Text font={11} fontWeight="bold" foregroundStyle="#C47BFF" kerning={0.5}>
          OG
        </Text>
        <HStack frame={{ maxWidth: "infinity" }}>
          <ProgressView
            value={data.session.remaining}
            total={100}
            progressViewStyle="linear"
            tint={meterColor(data.session.remaining, "#C47BFF")}
          />
        </HStack>
        <Text font={11} fontWeight="bold" monospacedDigit foregroundStyle="white">
          {data.ok ? `${data.session.remaining}%` : "--"}
        </Text>
      </HStack>
      <HStack spacing={6} frame={{ maxWidth: "infinity" }}>
        <Text font={9} monospacedDigit foregroundStyle="#6E7681">
          {"5h "}{data.session.resetText}
        </Text>
        <Spacer />
        <Text font={9} monospacedDigit foregroundStyle="#6E7681">
          {"周 "}{data.ok ? data.weekly.remaining : "--"}%{" · "}{data.weekly.resetText}
        </Text>
        <Text font={9} monospacedDigit foregroundStyle="#6E7681">
          {"月 "}{data.ok ? data.monthly.remaining : "--"}%{" · "}{data.monthly.resetText}
        </Text>
      </HStack>
    </VStack>
  )
}

function QuotaWidget({ codexA, codexB, opencode }: WidgetData) {
  return (
    <VStack
      alignment="leading"
      spacing={7}
      padding={12}
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
      <OpencodeRow data={opencode} />
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

    const opencodeEntry = providers.find((item: any) => item?.provider === "opencode")
    const opencodeWindows = Array.isArray(opencodeEntry?.windows)
      ? opencodeEntry.windows
      : []
    const ocPick = (kind: string) => opencodeWindows.find((window: any) => window?.kind === kind)
    // 月窗口在上游为 monthly，共享 schema 归一化为 billing，两者都接受。
    const ocMonthly = ocPick("monthly") || ocPick("billing")
    const ocSession = ocPick("session")
    const ocWeekly = ocPick("weekly")
    const opencodeOk = Boolean(opencodeEntry && ocSession && ocWeekly && ocMonthly)
    const opencode: OpencodeWidgetData = {
      ok: opencodeOk,
      session: {
        remaining: clampPercent(ocSession?.remainingPercent),
        resetText: formatSessionReset(ocSession?.resetsAt),
      },
      weekly: {
        remaining: clampPercent(ocWeekly?.remainingPercent),
        resetText: formatWeeklyReset(ocWeekly?.resetsAt),
      },
      monthly: {
        remaining: clampPercent(ocMonthly?.remainingPercent),
        resetText: formatWeeklyReset(ocMonthly?.resetsAt),
      },
    }

    Widget.present(
      <QuotaWidget
        codexA={providerData(account("A", 0), "A", "#5B9BFF")}
        codexB={providerData(account("B", 1), "B", "#3DDC97")}
        opencode={opencode}
      />
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    Widget.present(<ErrorWidget message={message} />)
  }
}

run()
