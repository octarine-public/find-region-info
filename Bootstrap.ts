import { EventsSDK, InputEventSDK } from "github.com/octarine-public/wrapper/index"
import PlayersSearchManager from "./Manager/Main"
import MenuManager from "./Manager/Menu"

const IMenu = new MenuManager()
const IManager = new PlayersSearchManager(IMenu)

EventsSDK.on("Draw", () =>
	IManager.OnDraw())

InputEventSDK.on("MouseKeyUp", key =>
	IManager.OnMouseKeyUp(key))

InputEventSDK.on("MouseKeyDown", key =>
	IManager.OnMouseKeyDown(key))

EventsSDK.on("WindowSizeChanged", () =>
	IManager.OnWindowSizeChanged())

EventsSDK.on("MatchmakingStatsUpdated", data =>
	IManager.OnMatchmakingStatsUpdated(data))
