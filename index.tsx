import { Script, Widget } from "scripting"

async function run() {
  await Widget.preview({ family: "systemSmall" })
  Script.exit()
}

run()
