import { Menu, Vector2 } from "wrapper/Imports"

export default class MenuManager {

	public Tree: Menu.Node
	public State: Menu.Toggle

	public ShowRegion: Menu.Toggle
	public Position: {
		X: Menu.Slider
		Y: Menu.Slider
		Vector: Vector2,
	}

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

		this.Position = this.Tree.AddVector2("Position", new Vector2(1237, 10), new Vector2(0, 0), new Vector2(1920, 1080))

		this.Reset = this.Tree.AddButton("Reset")
		this.Reset.OnValue(() => this.ResetSettings())
	}

	public get IMenu() {
		return {
			PositionX: this.Position.X.value,
			PositionY: this.Position.Y.value,
			ShowRegion: this.ShowRegion.value,
			OpacityHeader: this.OpacityHeader.value,
			OpacityRegion: this.OpacityRegion.value,
		}
	}

	public OnMenuChange(callback: () => void) {
		this.Reset.OnValue(() => callback())
		this.Position.X.OnValue(() => callback())
		this.Position.Y.OnValue(() => callback())
		this.ShowRegion.OnValue(() => callback())
		this.OpacityHeader.OnValue(() => callback())
		this.OpacityRegion.OnValue(() => callback())
	}

	protected ResetSettings() {
		this.State.value = true
		this.ShowRegion.value = false
		this.OpacityHeader.value = 100
		this.OpacityRegion.value = 85
		this.Position.X.value = 1237
		this.Position.Y.value = 10
	}
}
