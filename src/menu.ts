import { Paths } from "./paths"

/** Which way the regions unfold from the total. */
export const enum EOpenDirection {
	Up,
	Down
}

export class MenuManager {
	public IsToggled = true
	public readonly State: Menu.Toggle
	public readonly ToggleKey: Menu.KeyBind
	public readonly OnlyParty: Menu.Toggle
	public readonly Direction: Menu.Dropdown
	/**
	 * Whether the regions stand open beside the total. Kept off the page: the panel's own arrow
	 * flips it, and it only lives here so opened regions stay open after a restart.
	 */
	public readonly Expanded: Menu.Toggle
	public readonly Overlay: MenuSDK.OverlayMenu

	private readonly tree: Menu.Node
	/**
	 * The Insights section, shared with the Overwolf script: the panel is one of the pages
	 * in its side column, after the Overwolf panel's own (priority 2).
	 */
	private readonly baseNode = Menu.AddEntry(
		"Insights",
		PathData.WrapperMenuPath + "/icons/info.svg"
	)
	private readonly nodeIcon = `${Paths.MenuIcons}/queue.svg`

	constructor() {
		// the page was filed under Overwolf: a config saved there still lands on it
		MenuSDK.AddConfigMigration(raw =>
			MenuSDK.MigrateNodeTab(raw, "Overwolf", "Insights", "Total in search")
		)
		this.tree = this.baseNode.AddNode("Total in search", this.nodeIcon, "", -1, 2)
		this.tree.SortNodes = false
		this.State = this.tree.AddToggle("State", true)
		this.tree.HeaderControl = this.State
		this.tree.Gate = this.State
		this.ToggleKey = this.tree.AddKeybind("Key", "None", "Key turn on/off panel")
		this.ToggleKey.IconPath = MenuSDK.MenuIcons.Keyboard
		this.Overlay = new MenuSDK.OverlayMenu(this.tree, 1305, 1020)
		this.OnlyParty = this.tree.AddToggle(
			"Only party regions",
			true,
			"Count only the regions\nthe search is set to"
		)
		this.OnlyParty.IconPath = MenuSDK.MenuIcons.Globe
		this.Direction = this.tree.AddDropdown(
			"Open direction",
			["Up", "Down"],
			EOpenDirection.Up,
			"Which way the regions unfold\nfrom the total"
		)
		this.Direction.IconPath = MenuSDK.MenuIcons.ChevronsUpDown
		this.Expanded = this.tree.AddToggle("Expanded", true)
		this.Expanded.IsHidden = true
		this.State.OnValue(control => this.Overlay.SetHidden(!control.value))
		this.Overlay.SetHidden(!this.State.value)
		this.ToggleKey.OnRelease(({ assignedKey }) => {
			if (assignedKey < 0) {
				this.IsToggled = true
				return
			}
			this.IsToggled = !this.IsToggled
		})
	}

	public get OpensUp(): boolean {
		return this.Direction.SelectedID === EOpenDirection.Up
	}

	public get IsOpen(): boolean {
		return MenuSDK.MenuManager.IsOpen && this.tree.IsActivePage
	}
}
