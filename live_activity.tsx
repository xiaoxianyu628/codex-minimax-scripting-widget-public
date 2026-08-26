import {
  HStack,
  Image,
  LiveActivity,
  LiveActivityUI,
  LiveActivityUIBuilder,
  LiveActivityUIExpandedBottom,
  LiveActivityUIExpandedCenter,
  Spacer,
  Text,
  VStack,
} from "scripting"

export type ProviderUsageState = {
  weeklyRemaining: number
  weeklyUsed: number
  sessionRemaining: number | null
  sessionUsed: number | null
  weeklyResetAtMs: number | null
  sessionResetAtMs: number | null
}

export type QuotaUsageState = {
  codex: ProviderUsageState
  minimax: ProviderUsageState
  fetchedAtMs: number
  stale: boolean
  error: string | null
}

function percent(value: number | null): string {
  return value == null ? "--" : `${value}%`
}

function resetIn(resetAtMs: number | null): string {
  if (resetAtMs == null) return "重置未知"

  const remainingMs = resetAtMs - Date.now()
  if (remainingMs <= 0) return "即将重置"

  const minutes = Math.ceil(remainingMs / 60000)
  if (minutes < 60) return `${minutes} 分钟后重置`

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours} 小时后重置` : `${hours} 小时 ${rest} 分钟后重置`
}

function ProviderBlock({
  name,
  color,
  usage,
}: {
  name: string
  color: string
  usage: ProviderUsageState
}) {
  return (
    <VStack alignment="leading" spacing={2}>
      <HStack>
        <Text font={11} fontWeight="semibold" foregroundStyle={color}>{name}</Text>
        <Spacer />
        <Text font={11} fontWeight="bold" monospacedDigit foregroundStyle={color}>
          5 小时 {percent(usage.sessionRemaining)} · 一周 {percent(usage.weeklyRemaining)}
        </Text>
      </HStack>
      <Text font={9} foregroundStyle="#8995AD">
        5 小时 {resetIn(usage.sessionResetAtMs)}
      </Text>
      <Text font={9} foregroundStyle="#8995AD">
        一周 {resetIn(usage.weeklyResetAtMs)}
      </Text>
    </VStack>
  )
}

function Summary({ state }: { state: QuotaUsageState }) {
  return (
    <VStack spacing={6} padding={10}>
      <HStack>
        <Image systemName="terminal.fill" foregroundStyle="#AFC6FF" />
        <Text font={11} fontWeight="semibold" foregroundStyle="#D8DEED">AI QUOTA</Text>
        <Spacer />
        <Text font={9} foregroundStyle="#62E6B3">● LIVE</Text>
      </HStack>
      <ProviderBlock name="CODEX" color="#AFC6FF" usage={state.codex} />
      <ProviderBlock name="MINIMAX" color="#FF718A" usage={state.minimax} />
    </VStack>
  )
}

const builder: LiveActivityUIBuilder<QuotaUsageState> = (state) => (
  <LiveActivityUI
    content={<Summary state={state} />}
    compactLeading={
      <HStack>
        <Image systemName="terminal.fill" />
        <Text font={11} fontWeight="semibold" monospacedDigit>
          C {percent(state.codex.sessionRemaining)}
        </Text>
      </HStack>
    }
    compactTrailing={
      <Text font={11} monospacedDigit>
        M {percent(state.minimax.sessionRemaining)}
      </Text>
    }
    minimal={
      <Text font={11} fontWeight="bold" monospacedDigit>
        {percent(Math.min(state.codex.sessionRemaining ?? 100, state.minimax.sessionRemaining ?? 100))}
      </Text>
    }
  >
    <LiveActivityUIExpandedCenter>
      <Summary state={state} />
    </LiveActivityUIExpandedCenter>
    <LiveActivityUIExpandedBottom>
      <HStack padding={10}>
        <Text font={10} foregroundStyle="#8995AD">
          Codex 5小时/周 {percent(state.codex.sessionRemaining)}/{percent(state.codex.weeklyRemaining)}
        </Text>
        <Spacer />
        <Text font={10} foregroundStyle="#8995AD">
          MiniMax 5小时/周 {percent(state.minimax.sessionRemaining)}/{percent(state.minimax.weeklyRemaining)}
        </Text>
      </HStack>
    </LiveActivityUIExpandedBottom>
  </LiveActivityUI>
)

export const QuotaUsageActivity = LiveActivity.register("CodexUsageActivity", builder)
