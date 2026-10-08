import "./translations"

import { GUIHelper } from "./gui"
import { MenuManager } from "./menu"
import { SearchStats } from "./stats"

new (class CFindRegionInfo {
	private readonly menu = new MenuManager()
	private readonly stats = new SearchStats()
	private readonly gui = new GUIHelper(this.menu, this.stats)

	constructor() {
		EventsSDK.on("Draw", this.Draw.bind(this))
		EventsSDK.on("MatchmakingStatsUpdated", msg => this.stats.Update(msg))
		InputEventSDK.on("MouseKeyUp", this.MouseKeyUp.bind(this))
		InputEventSDK.on("MouseKeyDown", this.MouseKeyDown.bind(this))
	}

	protected get State() {
		return this.menu.State.value
	}

	/** The dashboard, whether or not a match is running behind it. */
	protected get IsMainMenu() {
		return GameState.UIState === DOTAGameUIState.DOTA_GAME_UI_STATE_DASHBOARD
	}

	public Draw() {
		if (this.State && this.IsMainMenu) {
			this.gui.Draw()
		} else {
			this.gui.Reset()
		}
	}

	public MouseKeyUp(key: VMouseKeys) {
		if (!this.shouldInput(key)) {
			return true
		}
		return this.gui.MouseKeyUp(key)
	}

	public MouseKeyDown(key: VMouseKeys) {
		if (!this.shouldInput(key)) {
			return true
		}
		return this.gui.MouseKeyDown(key)
	}

	private shouldInput(key: VMouseKeys) {
		if (!this.State) {
			return false
		}
		if (key !== VMouseKeys.MK_LBUTTON && key !== VMouseKeys.MK_RBUTTON) {
			return false
		}
		return this.IsMainMenu
	}
})()
