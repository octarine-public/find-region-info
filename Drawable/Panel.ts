import { ConVarsSDK, Color, GUIInfo, Input, Menu, Rectangle, RendererSDK, TextFlags, Vector2, VMouseKeys } from "github.com/octarine-public/wrapper/index"

import { MenuManager, scriptBasePath } from "../Manager/Menu"

export interface IMenu {
	PositionX: number
	PositionY: number
	ShowRegion: boolean
	OpacityHeader: number
	OpacityRegion: number
}

export class WindowPanel {
	public static OnWindowSizeChanged(): void {
		this.HeaderSize.x = GUIInfo.ScaleWidth(226)
		this.HeaderSize.y = GUIInfo.ScaleHeight(34)
		this.ArrowSize = GUIInfo.ScaleWidth(32)
		this.HeaderPadding = GUIInfo.ScaleWidth(4)
	}

	private static HeaderPosition = new Vector2()
	private static HeaderPadding = 0
	private static ArrowSize = 0
	private static readonly HeaderSize = new Vector2()

	private static readonly headerPath = scriptBasePath + "header.svg"
	private static readonly arrowActivePath = scriptBasePath + "arrow_active.svg"
	private static readonly arrowActivePath180 = scriptBasePath + "arrow_active180.svg"
	private static readonly arrowInactivePath = scriptBasePath + "arrow_inactive.svg"

	private TotalPlayers = 0
	private DirtyPosition = false
	private MouseOnPanel = new Vector2()

	private TextColorHeader = Color.White
	private TextColorRegion = Color.White
	private ImageColorHeader = Color.White
	private backgroundColor = new Color(23, 22, 39)

	constructor(protected menu: MenuManager) {
		this.menu.OnMenuChange(() => this.OnMenuChanged(menu.IMenu))
	}

	public get HeaderPosition() {
		return new Rectangle(
			WindowPanel.HeaderPosition.Clone(),
			WindowPanel.HeaderPosition.Add(WindowPanel.HeaderSize)
		)
	}

	public OnDraw(players: Map<number, string>, regions: number[]) {
		const baseHeader = this.HeaderPosition

		if (!baseHeader.IsZero()) {
			this.Header()
			this.Players(players, regions)
		}
		if (baseHeader.IsZero()) {
			return
		}

		if (this.DirtyPosition) {
			const mousePos = Input.CursorOnScreen
			WindowPanel.HeaderPosition.CopyFrom(mousePos.Subtract(this.MouseOnPanel))
			this.menu.Position.Vector = WindowPanel.HeaderPosition
				.Clone()
				.DivideScalarX(GUIInfo.GetWidthScale())
				.DivideScalarY(GUIInfo.GetHeightScale())
				.RoundForThis(1)
		}
	}

	public OnMenuChanged(menu: IMenu) {
		const headerOpacity = (menu.OpacityHeader / 100) * 255
		const regionOpacity = (menu.OpacityRegion / 100) * 255

		this.TextColorHeader.SetA(headerOpacity)
		this.TextColorRegion.SetA(regionOpacity)
		this.backgroundColor.SetA(regionOpacity)
		this.ImageColorHeader.SetA(headerOpacity)

		WindowPanel.HeaderPosition.CopyFrom(
			new Vector2(GUIInfo.ScaleWidth(menu.PositionX), GUIInfo.ScaleHeight(menu.PositionY))
		)
	}

	public OnMouseKeyUp(key: VMouseKeys) {
		if (key !== VMouseKeys.MK_LBUTTON) {
			return true
		}
		this.DirtyPosition = false
		Menu.Base.SaveConfigASAP = true
		this.menu.Position.Vector = this.HeaderPosition.pos1
			.Clone()
			.DivideScalarX(GUIInfo.GetWidthScale())
			.DivideScalarY(GUIInfo.GetHeightScale())
			.RoundForThis(1)
		return true
	}

	public OnMouseKeyDown(key: VMouseKeys) {
		if (key !== VMouseKeys.MK_LBUTTON || this.HeaderPosition.IsZero()) {
			return true
		}

		const headPad = WindowPanel.HeaderPadding
		const header = this.HeaderPosition

		header.pos1.AddScalarForThis(headPad)
		header.pos2.AddScalarForThis(-headPad)

		const arrSize = WindowPanel.ArrowSize
		const arrowPos = new Vector2(header.pos2.x - arrSize - headPad, header.pos1.y)

		if (new Rectangle(arrowPos, arrowPos.AddScalar(WindowPanel.ArrowSize)).Contains(
			Input.CursorOnScreen
		)) {
			this.menu.ShowRegion.value = !this.menu.ShowRegion.value
			return false
		}

		if (!header.Contains(Input.CursorOnScreen)) {
			return true
		}

		this.DirtyPosition = true
		this.MouseOnPanel.CopyFrom(Input.CursorOnScreen.Subtract(this.HeaderPosition.pos1))
		return false
	}
	protected DrawTextLine(text0: string, text1: string, rect: Rectangle, col: Color) {
		const flags: any[] = [
			col,
			2.1,
			0,
			undefined,
			undefined,
			false,
			false,
			false
		]

		flags[2] = TextFlags.Center | TextFlags.Left
		flags[5] = false
		RendererSDK.TextByFlags(text0, rect, ...flags)

		if (!text1) {
			return
		}

		flags[2] = TextFlags.Center | TextFlags.Right
		flags[5] = true
		RendererSDK.TextByFlags(text1, rect, ...flags)
	}
	protected Players(players: Map<number, string>, regions: number[]) {
		let TotalPlayers = 0

		const background = this.HeaderPosition
		const verticalDirection = background.pos1.y < RendererSDK.WindowSize.y / 2 ? 1 : -1

		let regionsMask = 0

		if (this.menu.ShowRegionOnlyLobby.value) {
			regionsMask ||= ConVarsSDK.GetInt("dota_matchgroups_new", 0)
			regionsMask ||= ConVarsSDK.GetInt("dota_matchgroups_automatic", 0)
		}
		regionsMask ||= ~0

		for (const [key, displayName] of players) {
			const playerCount = regions[key] ?? 0
			if (playerCount === 0) {
				continue
			}
			if (!(regionsMask & (1 << key))) {
				continue
			}

			if (this.menu.ShowRegion.value) {
				const localizedName = displayName.startsWith("#")
					? Menu.Localization.Localize(displayName.slice(1))
					: displayName

				const h = background.Height * verticalDirection
				background.pos1.y += h
				background.pos2.y += h
				RendererSDK.FilledRect(background.pos1, background.Size, this.backgroundColor)

				const textPosition = background.Clone()
				textPosition.pos1.AddScalarForThis(WindowPanel.HeaderPadding)
				textPosition.pos2.AddScalarForThis(-WindowPanel.HeaderPadding)

				this.DrawTextLine(
					localizedName,
					playerCount.toString(),
					textPosition,
					this.TextColorRegion
				)
			}
			TotalPlayers += playerCount
		}

		this.TotalPlayers = TotalPlayers
	}

	protected Header() {
		const header = this.HeaderPosition

		RendererSDK.Image(WindowPanel.headerPath, header.pos1, undefined, header.Size, this.ImageColorHeader)

		const arrSize = WindowPanel.ArrowSize
		const headPad = WindowPanel.HeaderPadding
		header.pos2.x -= arrSize

		const textRect = header.Clone()
		textRect.pos1.AddScalarForThis(headPad)
		textRect.pos2.AddScalarForThis(-headPad)
		//textRect.pos2.x -= arrSize
		//textRect.pos2.y -= headPad

		this.DrawTextLine(
			Menu.Localization.Localize("Total in search") +
			": " + this.TextPlayers(this.TotalPlayers),
			"",
			textRect,
			this.TextColorHeader
		)

		const verticalDirection = header.pos1.y < RendererSDK.WindowSize.y / 2
		RendererSDK.Image(
			this.menu.ShowRegion.value
				? verticalDirection
					? WindowPanel.arrowActivePath
					: WindowPanel.arrowActivePath180
				: WindowPanel.arrowInactivePath,
			new Vector2(header.pos2.x, header.pos1.y),
			undefined,
			new Vector2().AddScalarForThis(arrSize),
			this.ImageColorHeader
		)
	}

	protected TextPlayers(count: number) {
		return (
			count +
			" " +
			this.NumberDeclension(count, [
				Menu.Localization.Localize("player"),
				Menu.Localization.Localize("players"),
				Menu.Localization.Localize("players_x")
			])
		)
	}

	private NumberDeclension(num: number, names: string[]): string {
		const cases = [2, 0, 1, 1, 1, 2]
		return names[num % 100 > 4 && num % 100 < 20 ? 2 : cases[num % 10 < 5 ? num % 10 : 5]]
	}
}
