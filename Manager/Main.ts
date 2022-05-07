import { DOTAGameUIState_t, GameState, Parse, VMouseKeys } from "wrapper/Imports"
import WindowPanel from "../Drawable/Panel"
import MenuManager from "./Menu"

export default class PlayersSearchManager {

	protected Panel: WindowPanel
	protected Groups = new Map<number, string>()

	protected TotalPlayers = 0
	protected UpdateDataRegion: Nullable<RecursiveMap>

	constructor(protected menu: MenuManager) {
		this.Panel = new WindowPanel(menu)
	}

	protected get State() {
		return this.menu.State.value
			&& this.UpdateDataRegion !== undefined
			&& GameState.UIState === DOTAGameUIState_t.DOTA_GAME_UI_STATE_DASHBOARD
	}

	public OnDraw() {
		if (!this.State)
			return
		this.Panel.OnDraw(
			this.Groups,
			this.UpdateDataRegion!.get("legacy_searching_players_by_group_source2") as number[],
		)
	}

	public OnWindowSizeChanged() {
		WindowPanel.OnWindowSizeChanged()
		this.Panel.OnMenuChanged(this.menu.IMenu)
	}

	public OnMouseKeyUp(key: VMouseKeys) {
		if (!this.State)
			return true
		return this.Panel.OnMouseKeyUp(key)
	}

	public OnMouseKeyDown(key: VMouseKeys) {
		if (!this.State)
			return true
		return this.Panel.OnMouseKeyDown(key)
	}

	public OnMatchmakingStatsUpdated(data: RecursiveMap) {
		this.UpdateDataRegion = data
		if (this.Groups.size === 0)
			this.Groups = this.GetGroups()
	}

	protected GetGroups() {
		const kv = Parse.parseKVFile("scripts/matchgroups.txt")
		const values = [...((kv.get("matchgroups") as RecursiveMap) ?? new Map()).values()]
			.filter(a => a instanceof Map) as RecursiveMap[]
		return new Map(values.map(a => [parseInt(a.get("group") as string), a.get("display_name") as string]))
	}
}
