import { Menu } from "wrapper/Imports"

export default class MenuManager {

	public Tree: Menu.Node
	public State: Menu.Toggle

	public ShowRegion: Menu.Toggle
	public PositionX: Menu.Slider
	public PositionY: Menu.Slider

	public OpacityHeader: Menu.Slider
	public OpacityRegion: Menu.Slider

	public Reset: Menu.Button

	constructor() {
		const menu = Menu.AddEntry("Main")

		this.Tree = menu.AddNode("Finding Info")
		this.State = this.Tree.AddToggle("State", true)

		this.ShowRegion = this.Tree.AddToggle("Show regions")
		this.OpacityHeader = this.Tree.AddSlider("Opacity header", 100, 25, 100)
		this.OpacityRegion = this.Tree.AddSlider("Opacity region", 85, 25, 100)

		this.PositionX = this.Tree.AddSlider("Position: X", 1237, 0, 2000)
		this.PositionY = this.Tree.AddSlider("Position: Y", 10, 0, 2000)

		this.Reset = this.Tree.AddButton("Reset")
		this.Reset.OnValue(() => this.ResetSettings())
	}

	public get IMenu() {
		return {
			PositionX: this.PositionX.value,
			PositionY: this.PositionY.value,
			ShowRegion: this.ShowRegion.value,
			OpacityHeader: this.OpacityHeader.value,
			OpacityRegion: this.OpacityRegion.value,
		}
	}

	public OnMenuChange(callback: () => void) {
		this.Reset.OnValue(() => callback())
		this.PositionX.OnValue(() => callback())
		this.PositionY.OnValue(() => callback())
		this.ShowRegion.OnValue(() => callback())
		this.OpacityHeader.OnValue(() => callback())
		this.OpacityRegion.OnValue(() => callback())
	}

	protected ResetSettings() {
		this.State.value = true
		this.ShowRegion.value = false
		this.OpacityHeader.value = 100
		this.OpacityRegion.value = 85
		this.PositionX.value = 1237
		this.PositionY.value = 10
	}
}

Menu.Localization.AddLocalizationUnit("english", new Map([
	["players_x", "players"],
]))

Menu.Localization.AddLocalizationUnit("russian", new Map([
	["player", "игрок"],
	["players", "игрока"],
	["players_x", "игроков"],
	["Show regions", "Показать регионы"],
	["Total in search", "Всего в поиске"],
	["Finding Info", "Информация о поиске"],
	["Opacity header", "Прозрачность заголовка"],
	["Opacity region", "Прозрачность регионов"],
]))
