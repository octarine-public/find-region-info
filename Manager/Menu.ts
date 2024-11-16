import { Menu, Vector2 } from "github.com/octarine-public/wrapper/index"
export const scriptBasePath = "github.com/octarine-public/find-region-info/scripts_files/"

export class MenuManager {
	public Tree: Menu.Node
	public State: Menu.Toggle

	public ShowRegion: Menu.Toggle
	public ShowRegionOnlyLobby: Menu.Toggle

	public Position: {
		X: Menu.Slider
		Y: Menu.Slider
		Vector: Vector2
	}

	public OpacityHeader: Menu.Slider
	public OpacityRegion: Menu.Slider

	public readonly iconQueueInfo = scriptBasePath + "queue_info.svg"

	constructor() {
		const menu = Menu.AddEntry("Overwolf")

		this.Tree = menu.AddNode("Total in search", this.iconQueueInfo)
		this.State = this.Tree.AddToggle("State", true)

		this.ShowRegion = this.Tree.AddToggle("Show regions", true)
		this.ShowRegionOnlyLobby = this.Tree.AddToggle("Only party regions", true)

		this.OpacityHeader = this.Tree.AddSlider("Opacity header", 100, 25, 100)
		this.OpacityRegion = this.Tree.AddSlider("Opacity region", 85, 25, 100)

		this.Position = this.Tree.AddVector2(
			"Position",
			new Vector2(1305, 1025),
			new Vector2(0, 0),
			new Vector2(1920, 1080)
		)
	}

	public get IMenu() {
		return {
			PositionX: this.Position.X.value,
			PositionY: this.Position.Y.value,
			ShowRegion: this.ShowRegion.value,
			OpacityHeader: this.OpacityHeader.value,
			OpacityRegion: this.OpacityRegion.value
		}
	}

	public OnMenuChange(callback: () => void) {
		this.Position.X.OnValue(() => callback())
		this.Position.Y.OnValue(() => callback())
		this.ShowRegion.OnValue(() => callback())
		this.OpacityHeader.OnValue(() => callback())
		this.OpacityRegion.OnValue(() => callback())
	}
}
