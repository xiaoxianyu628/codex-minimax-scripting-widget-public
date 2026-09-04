import { HStack, ProgressView, Script, Spacer, Text, VStack, Widget } from "scripting"

const HUB = "https://token-monitor-hub.xiaoxianyu628.workers.dev/api/public/stats"

function percent(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.min(100, Math.round(number))) : 0
}

function countdown(value: unknown) {
  const ms = new Date(String(value || "")).getTime() - Date.now()
  if (!Number.isFinite(ms) || ms <= 0) return "即将重置"
  const minutes = Math.ceil(ms / 60000)
  return minutes < 60 ? `${minutes}m` : `${Math.ceil(minutes / 60)}h`
}

function Row({ label, item, color }: { label: string; item: any; color: string }) {
  const windows = Array.isArray(item?.windows) ? item.windows : []
  const session = windows.find((window: any) => window?.kind === "session")
  const weekly = windows.find((window: any) => window?.kind === "weekly")
  return <VStack alignment="leading" spacing={3} frame={{ maxWidth: "infinity" }}>
    <HStack frame={{ maxWidth: "infinity" }}><Text font={11} fontWeight="bold" foregroundStyle={color}>{label}</Text><Spacer /><Text font={11} monospacedDigit foregroundStyle="white">5h {percent(session?.remainingPercent)}%</Text></HStack>
    <ProgressView value={percent(session?.remainingPercent)} total={100} progressViewStyle="linear" tint={color} />
    <Text font={9} foregroundStyle="#9DA9C0">重置 {countdown(session?.resetsAt)} · 周 {percent(weekly?.remainingPercent)}%</Text>
  </VStack>
}

async function run() {
  try {
    const response = await fetch(HUB, { timeout: 15 })
    if (!response.ok) throw new Error(`服务器错误 ${response.status}`)
    const data = await response.json()
    const providers = Array.isArray(data?.limits?.providers) ? data.limits.providers : []
    const accounts = providers.filter((item: any) => item?.provider === "codex")
    const account = (slot: string, fallbackIndex: number) => accounts.find((item: any) =>
      String(item?.accountSlot || "").toUpperCase().includes(slot)
    ) || accounts[fallbackIndex]
    const codexA = account("A", 0)
    const codexB = account("B", 1)
    if (!codexA || !codexB) throw new Error("服务器尚未同步两个 Codex 账号")
    Widget.present(<VStack alignment="leading" spacing={10} padding={14} frame={{ maxWidth: "infinity", maxHeight: "infinity" }} widgetBackground="#10182A">
      <Text font={13} fontWeight="bold" foregroundStyle="white">CODEX QUOTA</Text>
      <Row label="CODEX A" item={codexA} color="#AFC6FF" />
      <Row label="CODEX B" item={codexB} color="#62E6B3" />
    </VStack>)
  } catch (error) {
    Widget.present(<VStack padding={16} widgetBackground="#10182A"><Text foregroundStyle="white">额度读取失败</Text><Text font={10} foregroundStyle="#9DA9C0">{String(error)}</Text></VStack>)
  }
}

if (Script.env === "widget") run()
